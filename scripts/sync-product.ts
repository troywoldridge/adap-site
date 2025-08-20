// scripts/sync-product.ts
/**
 * Usage:
 *   pnpm -s sync:product <productId> <storeCode>
 *
 * Example:
 *   pnpm -s sync:product 7557 9
 */
import { db, withTx, normalizeMeta } from "./lib";
import { getProductOptions, getPricePayload } from "./sina";

function normKey(s: string): string {
  return String(s || "").trim();
}

async function upsertProductBase(params: {
  id: number;
  storeCode: number;
  sku?: string | null;
  name?: string | null;
  category?: string | null;
  enabled?: number | boolean | null;
  meta?: unknown;
}) {
  const { id, storeCode, sku = null, name = null, category = null, enabled = null, meta } = params;
  const m = normalizeMeta(meta);

  await db(
    `
    INSERT INTO products (id, store_code, sku, name, category, enabled, meta)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    ON CONFLICT (id, store_code) DO UPDATE SET
      sku      = EXCLUDED.sku,
      name     = EXCLUDED.name,
      category = EXCLUDED.category,
      enabled  = EXCLUDED.enabled,
      meta     = COALESCE(products.meta, '{}'::jsonb) || COALESCE(EXCLUDED.meta, '{}'::jsonb)
    `,
    [
      id,
      storeCode,
      sku,
      name,
      category,
      enabled == null ? null : Number(enabled) ? 1 : 0,
      m,
    ]
  );
}

async function upsertGroup(productId: number, storeCode: number, group_key: string, group_label?: string | null) {
  await db(
    `
    INSERT INTO product_option_groups (product_id, store_code, group_key, group_label, meta)
    VALUES ($1, $2, $3, $4, '{}'::jsonb)
    ON CONFLICT (product_id, store_code, group_key) DO UPDATE SET
      group_label = COALESCE(EXCLUDED.group_label, product_option_groups.group_label)
    `,
    [productId, storeCode, group_key, group_label || null]
  );
}

async function upsertOption(row: {
  productId: number;
  storeCode: number;
  group_key: string;
  option_id: number;
  option_name: string;
  hidden: number;
}) {
  await db(
    `
    INSERT INTO product_options (product_id, store_code, group_key, option_id, option_name, hidden, meta)
    VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb)
    ON CONFLICT (product_id, store_code, group_key, option_id) DO UPDATE SET
      option_name = EXCLUDED.option_name,
      hidden      = EXCLUDED.hidden
    `,
    [
      row.productId,
      row.storeCode,
      row.group_key,
      row.option_id,
      row.option_name,
      row.hidden,
    ]
  );
}

async function upsertPricingMeta(productId: number, storeCode: number, hash: string, value: string | null, markup: number | null) {
  await db(
    `
    INSERT INTO product_pricing_meta (product_id, store_code, hash, value, markup, meta)
    VALUES ($1, $2, $3, $4, $5, '{}'::jsonb)
    ON CONFLICT (product_id, store_code, hash) DO UPDATE SET
      value  = EXCLUDED.value,
      markup = EXCLUDED.markup
    `,
    [productId, storeCode, hash, value, markup]
  );
}

async function main() {
  const [,, idArg, storeArg] = process.argv;
  const productId = Number(idArg);
  const storeCode = Number(storeArg);

  if (!Number.isFinite(productId) || !Number.isFinite(storeCode)) {
    console.error("Usage: pnpm sync:product <productId> <storeCode(6|9)>");
    process.exit(1);
  }

  const [opts, pricingMeta, metaArr] = await getProductOptions(productId, storeCode);

  const productMetaMerged = Array.isArray(metaArr) && metaArr.length
    ? metaArr.reduce((acc, m) => Object.assign(acc, normalizeMeta(m)), {} as Record<string, unknown>)
    : {};

  await withTx(async (q) => {
    // 1) ensure base product exists
    await upsertProductBase({
      id: productId,
      storeCode,
      sku: null,
      name: null,
      category: null,
      enabled: 1,
      meta: productMetaMerged,
    });

    // 2) groups + options
    const groups = new Map<string, string>(); // group_key -> label (same for now)
    for (const r of opts) {
      const group_key = normKey(r.group);
      const option_name = normKey(r.name);
      if (!group_key || !option_name) continue;

      if (!groups.has(group_key)) groups.set(group_key, group_key);
      await upsertOption({
        productId,
        storeCode,
        group_key,
        option_id: Number(r.id),
        option_name,
        hidden: Number(r.hidden || 0),
      });
    }
    for (const [gk, gl] of groups) {
      await upsertGroup(productId, storeCode, gk, gl);
    }

    // 3) pricing meta hashes
    for (const h of pricingMeta) {
      await upsertPricingMeta(productId, storeCode, String(h.hash), h?.value ?? null, h?.markup ?? null);
    }

    // 4) sanity: sample price ping using one valid combination if available
    //    (totally optional but helpful; it proves you can POST /price/{id}/{storeCode})
    const sampleIds: number[] = [];
    // try picking first option of each of these common groups if present
    for (const key of ["Stock", "size", "qty", "Turnaround"]) {
      const rows = await q(
        `SELECT option_id FROM product_options 
         WHERE product_id=$1 AND store_code=$2 AND group_key=$3 AND hidden=0 
         ORDER BY sort_index NULLS LAST, option_id ASC LIMIT 1`,
        [productId, storeCode, key]
      );
      if (rows.length) sampleIds.push(Number(rows[0].option_id));
    }
    if (sampleIds.length >= 2) {
      try {
        await getPricePayload(productId, storeCode, sampleIds);
      } catch (e) {
        // not fatal; some combos won’t price until all mandatory options are included
      }
    }
  });

  console.log(`✅ Synced product ${productId} (store ${storeCode})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
