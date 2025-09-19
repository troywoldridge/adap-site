// src/lib/product-map.ts
import productAssetsRaw from "@/data/productAssets.json";

/** Normalized shape we’ll use after mapping */
type ProductAsset = {
  product_id: number | string;        // required AFTER normalization
  id?: number | string;
  name?: string;
  slug?: string;
  cloudflare_id?: string | null;
  matched_sku?: string | null;
  // you can add other passthroughs later if needed
};

/** The raw rows can come in many flavors—be generous */
type RawProduct = {
  id?: number | string | null;
  product_id?: number | string | null;
  sinalite_id?: number | string | null;

  sku?: string | null;
  matched_sku?: string | null;

  slug?: string | null;
  product_slug?: string | null;
  name?: string | null;

  cloudflare_id?: string | null;
  cf_image_1_id?: string | null;
  cf_image_2_id?: string | null;
  cf_image_3_id?: string | null;
  cf_image_4_id?: string | null;

  [k: string]: unknown;
};

const rows: RawProduct[] = Array.isArray(productAssetsRaw)
  ? (productAssetsRaw as unknown as RawProduct[])
  : [];

const simple = (t?: string | null) =>
  (t ?? "").toLowerCase().replace(/[_-]+/g, " ").trim();

/** Build a normalized list with a guaranteed product_id (number/string), then filter invalid */
const productAssets: ProductAsset[] = rows
  .map((r): ProductAsset | null => {
    const pid = r.product_id ?? r.id ?? r.sinalite_id;
    if (pid == null) return null;

    const matched_sku = r.matched_sku ?? r.sku ?? null;
    const slug =
      r.slug ??
      r.product_slug ??
      (matched_sku ? matched_sku : undefined);

    const cloudflare_id =
      r.cloudflare_id ??
      r.cf_image_1_id ??
      r.cf_image_2_id ??
      r.cf_image_3_id ??
      r.cf_image_4_id ??
      null;

    return {
      product_id: pid,
      id: r.id ?? undefined,
      name: r.name ?? undefined,
      slug: slug ?? undefined,
      cloudflare_id,
      matched_sku,
    };
  })
  // keep only entries that resolve to a positive numeric id or a non-empty string id
  .filter((p): p is ProductAsset => {
    if (typeof p?.product_id === "number") return p.product_id > 0;
    if (typeof p?.product_id === "string") return p.product_id.trim().length > 0;
    return false;
  });

/**
 * Robust resolver for a subcategory → productId
 * - honors s.product_id if present
 * - tries productAssets by slug, then by name, then by matched_sku
 */
export function productIdForSubcategory(s: {
  slug: string;
  name: string;
  product_id?: number | string | null;
}): number | null {
  // 0) direct on the subcategory object
  if (s.product_id !== undefined && s.product_id !== null) {
    const n = Number(s.product_id);
    if (!Number.isNaN(n) && n > 0) return n;
  }

  // 1) try exact slug match
  const bySlug = productAssets.find(
    (p) =>
      p.slug &&
      simple(p.slug) === simple(s.slug) &&
      Number(p.product_id) > 0
  );
  if (bySlug) return Number(bySlug.product_id);

  // 2) try name match
  const byName = productAssets.find(
    (p) =>
      Number(p.product_id) > 0 &&
      ((p.name && simple(p.name) === simple(s.name)) ||
        (p.name && simple(p.name).includes(simple(s.name))))
  );
  if (byName) return Number(byName.product_id);

  // 3) try matched_sku vs slug/name
  const bySku = productAssets.find(
    (p) =>
      Number(p.product_id) > 0 &&
      p.matched_sku &&
      (simple(p.matched_sku) === simple(s.slug) ||
        simple(p.matched_sku) === simple(s.name))
  );
  if (bySku) return Number(bySku.product_id);

  return null;
}
