// src/lib/cfImageResolver.ts
import productAssets from "@/data/productAssets.json";
import { getSinaliteProductMeta } from "@/lib/sinalite.client";

/**
 * productAssets.json rows look like:
 * {
 *   "category_id": "5",
 *   "subcategory_id": "130",
 *   "name": "promotional_main",
 *   "image_name": "promo-group-1.png",
 *   "cloudflare_id": "0102573e-1ef9-4252-6bd6-0d9300d06b00",
 *   "product_id": 0,
 *   "matched_sku": ""
 * }
 */

type AssetRow = {
  product_id?: number | string;
  subcategory_id?: number | string;
  category_id?: number | string;
  cloudflare_id?: string | null;
  name?: string | null;
};

const rows: AssetRow[] = Array.isArray(productAssets) ? (productAssets as any[]) : [];

// Fast index for direct product -> CF image id
const productIndex = new Map<number, string>();
for (const r of rows) {
  const pid = Number((r.product_id ?? 0));
  const cid = (r.cloudflare_id ?? "").trim();
  if (Number.isFinite(pid) && pid > 0 && cid && !productIndex.has(pid)) {
    productIndex.set(pid, cid);
  }
}

function pickPreferred(rows: AssetRow[]): string | null {
  // prefer names that look like a “main” image, else first with an id
  const main = rows.find(r => (r.cloudflare_id ?? "").trim() && /main|hero|primary/i.test(String(r.name ?? "")));
  if (main?.cloudflare_id) return main.cloudflare_id.trim();
  const first = rows.find(r => (r.cloudflare_id ?? "").trim());
  return first ? first.cloudflare_id!.trim() : null;
}

/**
 * Strict Cloudflare-only resolver.
 * 1) product_id match in JSON
 * 2) subcategory_id match in JSON (requires meta)
 * 3) category_id match in JSON (requires meta)
 * returns Cloudflare image **ID** (not a URL) or null
 */
export async function cfImageIdForProductStrict(productId: number): Promise<string | null> {
  if (!Number.isFinite(productId) || productId <= 0) return null;

  const direct = productIndex.get(productId);
  if (direct) return direct;

  // Need metadata to find subcategory/category
  let meta: any = null;
  try {
    meta = await getSinaliteProductMeta(String(productId));
  } catch {
    // ignore
  }

  const subIds = [
    Number(meta?.subcategory_id),
    Number(meta?.subCategoryId),
    Number(meta?.subcategoryId),
  ].filter(n => Number.isFinite(n)) as number[];

  for (const subId of subIds) {
    const matches = rows.filter(r => Number(r.subcategory_id) === subId);
    const pick = pickPreferred(matches);
    if (pick) return pick;
  }

  const catIds = [
    Number(meta?.category_id),
    Number(meta?.categoryId),
  ].filter(n => Number.isFinite(n)) as number[];

  for (const catId of catIds) {
    const matches = rows.filter(r => Number(r.category_id) === catId);
    const pick = pickPreferred(matches);
    if (pick) return pick;
  }

  return null;
}
