// src/lib/product-map.ts
import productAssetsRaw from "@/data/productAssets.json";

/** Shape used in productAssets.json */
type ProductAsset = {
  id?: number | string;
  name?: string;
  slug?: string;
  cloudflare_id?: string | null;
  product_id: number | string;
  matched_sku?: string | null;
};

const productAssets: ProductAsset[] = Array.isArray(productAssetsRaw)
  ? (productAssetsRaw as ProductAsset[])
  : [];

const simple = (t: string) => t.toLowerCase().replace(/[_-]+/g, " ").trim();

/**
 * Robust resolver for a subcategory → productId
 * - honors s.product_id if present
 * - tries productAssets by slug, then by name, then by matched_sku
 */
export function productIdForSubcategory(s: {
  slug: string;
  name: string;
  // optional: if you later add product_id to subcategoryAssets
  product_id?: number | string | null;
}): number | null {
  // 0) direct on the subcategory object
  if (s.product_id !== undefined && s.product_id !== null) {
    const n = Number(s.product_id);
    if (!Number.isNaN(n) && n > 0) {
      return n;
    }
  }

  // 1) try exact slug match
  const bySlug = productAssets.find(
    (p) => p.slug && simple(p.slug) === simple(s.slug) && Number(p.product_id) > 0
  );
  if (bySlug) {
    return Number(bySlug.product_id);
  }

  // 2) try name match
  const byName = productAssets.find(
    (p) =>
      Number(p.product_id) > 0 &&
      ((p.name && simple(p.name) === simple(s.name)) ||
        (p.name && simple(p.name).includes(simple(s.name))))
  );
  if (byName) {
    return Number(byName.product_id);
  }

  // 3) try matched_sku vs slug/name
  const bySku = productAssets.find(
    (p) =>
      Number(p.product_id) > 0 &&
      p.matched_sku &&
      (simple(p.matched_sku) === simple(s.slug) ||
        simple(p.matched_sku) === simple(s.name))
  );
  if (bySku) {
    return Number(bySku.product_id);
  }

  return null;
}
