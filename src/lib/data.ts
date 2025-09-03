// src/lib/data.ts
// Centralized image + asset helpers (Cloudflare CDN + Sinalite-aligned data)
// Uses categoryAssets.json, subcategoryAssets.json, productAssets.json

import slugify from "slugify";

// IMPORTANT: JSON imports assume Next.js bundler supports importing JSON.
// If using TypeScript, ensure `"resolveJsonModule": true` in tsconfig if needed.
import categoryAssets from "@/data/categoryAssets.json";
import subcategoryAssets from "@/data/subcategoryAssets.json";
import productAssets from "@/data/productAssets.json";

/* ===============================
   Cloudflare Images URL builder
   =============================== */
const CF_ACCOUNT_HASH =
  process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH ||
  process.env.CF_ACCOUNT_HASH ||
  "";

/**
 * Build a Cloudflare Images URL.
 * https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT>
 * Keep variants consistent with your Cloudflare Images variants.
 */
export function cfUrl(
  imageId: string,
  variant: string = "public",
  accountHash: string = CF_ACCOUNT_HASH
): string | null {
  if (!imageId || !accountHash) return null;
  return `https://imagedelivery.net/${accountHash}/${imageId}/${variant}`;
}

// ✅ tiny helper; uses slugify so the import is utilized
function toSlug(s: string | null | undefined) {
  const v = (s ?? "").toString().trim();
  if (!v) return "";
  return slugify(v, { lower: true, strict: true, trim: true });
}

/* ===============================
   Types (loose, tolerant to columns)
   =============================== */
export type CategoryAsset = {
  slug: string;
  name?: string;
  category_id?: number;
  sort_order?: number;
  cf_image_id?: string | null;
  [k: string]: unknown;
};

export type SubcategoryAsset = {
  slug: string;
  name?: string;
  subcategory_id?: number;
  category_id?: number;
  sort_order?: number;
  cf_image_id?: string | null;
  [k: string]: unknown;
};

export type ProductAsset = {
  // Sinalite-aligned identifiers
  sinalite_id?: number;
  id?: number;
  category_id?: number;
  subcategory_id?: number;
  sku?: string;
  name?: string;
  canonical_uuid?: string | null;
  [k: string]: unknown;
};

/* ===============================
   In-memory maps for fast lookup
   =============================== */

// Categories — normalize slug on the fly (safe, tiny change)
const categoryBySlug = new Map<string, CategoryAsset>();
for (const r of categoryAssets as Array<Record<string, unknown>>) {
  const raw = (r as any).slug as string | undefined;
  const ensured = (raw && raw.trim()) || toSlug((r as any).name as string | undefined);
  if (!ensured) continue;
  const row = { ...(r as object), slug: ensured } as CategoryAsset;
  categoryBySlug.set(ensured, row);
}

// Subcategories — ✅ guarantee slug (fixes TS2352 root cause)
const subcategoryBySlug = new Map<string, SubcategoryAsset>();
for (const r of subcategoryAssets as Array<Record<string, unknown>>) {
  const raw = (r as any).slug as string | undefined;
  const ensured = (raw && raw.trim()) || toSlug((r as any).name as string | undefined);
  if (!ensured) continue; // skip rows we can’t safely link
  const row = { ...(r as object), slug: ensured } as SubcategoryAsset;
  subcategoryBySlug.set(ensured, row);
}

// For products, index by slug/sku/id and collect Cloudflare image IDs
type ProductIndexRecord = {
  slug?: string;
  sku?: string;
  id?: number;
  sinalite_id?: number;
  imageIds: string[];
  raw: ProductAsset;
};

const productsBySlug = new Map<string, ProductIndexRecord>();
const productsBySku = new Map<string, ProductIndexRecord>();
const productsById = new Map<number, ProductIndexRecord>();

function pickProductSlug(p: ProductAsset) {
  // common keys we've seen: "slugs (products)", "slug", "product_slug"
  return (
    (p["slugs (products)"] as string) ??
    (p["product_slug"] as string) ??
    (p["slug"] as string) ??
    (p["slugs"] as string) ??
    ""
  );
}

function collectProductImageIds(p: ProductAsset): string[] {
  const ids: string[] = [];
  const keys = ["cf_image_1_id", "cf_image_2_id", "cf_image_3_id", "cf_image_4_id"];
  for (const k of keys) {
    const val = p[k] as string | null | undefined;
    if (val && typeof val === "string") ids.push(val);
  }
  const single = p["cf_image_id"] as string | null | undefined;
  if (single && typeof single === "string" && !ids.length) {
    ids.push(single);
  }
  return ids;
}

for (const raw of productAssets as ProductAsset[]) {
  const slug = pickProductSlug(raw)?.toString().trim();
  const sku = (raw.sku ?? "").toString().trim();
  const idNum = typeof raw.id === "number" ? raw.id : Number(raw.id);
  const rec: ProductIndexRecord = {
    slug,
    sku,
    id: Number.isFinite(idNum) ? idNum : undefined,
    sinalite_id:
      typeof raw.sinalite_id === "number" ? raw.sinalite_id : Number(raw.sinalite_id),
    imageIds: collectProductImageIds(raw),
    raw,
  };

  if (slug) productsBySlug.set(slug, rec);
  if (sku) productsBySku.set(sku, rec);
  if (rec.id !== undefined) productsById.set(rec.id, rec);
}

/* ===============================
   Public helpers
   =============================== */

/** Get a category thumbnail URL by category slug (Cloudflare CDN). */
export function getCategoryThumb(
  categorySlug: string,
  variant: string = "categoryThumb"
): string | null {
  const row = categoryBySlug.get(categorySlug);
  const id = (row?.cf_image_id ?? "") as string;
  return id ? cfUrl(id, variant) : null;
}

/** Get a subcategory thumbnail URL by subcategory slug (Cloudflare CDN). */
export function getSubcategoryThumb(
  subcategorySlug: string,
  variant: string = "subcategoryThumb"
): string | null {
  const row = subcategoryBySlug.get(subcategorySlug);
  const id = (row?.cf_image_id ?? "") as string;
  return id ? cfUrl(id, variant) : null;
}

/** Get the product gallery image URLs by product slug (preferred), sku, or id. */
export function getProductGallery(
  key: { slug?: string; sku?: string; id?: number | string },
  variant: string = "productCard"
): (string | null)[] {
  const { slug, sku, id } = key;

  let rec: ProductIndexRecord | undefined;
  if (slug) rec = productsBySlug.get(slug);
  if (!rec && sku) rec = productsBySku.get(sku);
  if (!rec && (id !== undefined && id !== null)) {
    const n = typeof id === "number" ? id : Number(id);
    if (Number.isFinite(n)) rec = productsById.get(n);
  }
  if (!rec) return [];

  return rec.imageIds.map((img) => cfUrl(img, variant)).filter(Boolean);
}

/** Get the FIRST/hero image for a product (slug/sku/id). */
export function getProductHero(
  key: { slug?: string; sku?: string; id?: number | string },
  variant: string = "public"
): string | null {
  const gallery = getProductGallery(key, variant);
  return gallery.length ? (gallery[0] as string) : null;
}

/* ===============================
   (Optional) Maps if you need them elsewhere
   =============================== */
export const __categoryMap = categoryBySlug;
export const __subcategoryMap = subcategoryBySlug;
export const __productsBySlug = productsBySlug;
export const __productsBySku = productsBySku;
export const __productsById = productsById;
