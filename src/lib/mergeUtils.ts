// src/lib/mergeUtils.ts

import categoryAssetsRaw from "@/data/categoryAssets.json";
import subcategoryAssetsRaw from "@/data/subcategoryAssets.json";
import productAssetsRaw from "@/data/productAssets.json";
// If you don't actually have images.json, just remove these next two lines + usage below.
import imagesRaw from "@/data/images.json";

/* -----------------------------------------------------------
   1) Raw JSON row types (match your actual files loosely)
   ----------------------------------------------------------- */
type RawCategoryRow = {
  id?: number | string | null;
  slug?: string | null;
  name?: string | null;
  cf_image_id?: string | null;
  cf_image_variant?: string | null;
  image_url?: string | null;
  description?: string | null;
  sort_order?: number | null;
  qa_has_image?: boolean | null;
};

export type CategoryAsset = {
  imageId?: string;
  variant?: string;      // Cloudflare Images variant
  imageUrl?: string;     // full URL fallback (rare)
  description?: string;
};

export interface SubcategoryAsset {
  id?: number | string | null;
  category_id?: number | string | null;
  slug?: string | null;
  name?: string | null;
  description?: string | null;
  cloudflare_image_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProductAsset {
  category_id?: number | string | null;
  subcategory_id?: number | string | null;
  name?: string | null;
  image_name?: string | null;
  cloudflare_id?: string | null;
  product_id?: number | null;
  matched_sku?: string | null;
}

export interface ImageAsset {
  category_id?: number | string | null;
  subcategory_id?: number | string | null;
  name?: string | null;
  image_name?: string | null;
  cloudflare_id?: string | null;
  product_id?: number | null;
  matched_sku?: string | null;
}

/* -----------------------------------------------------------
   2) Helpers
   ----------------------------------------------------------- */
function norm(input?: string | null) {
  return (input ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function alternates(base: string) {
  const set = new Set<string>([base]);
  if (base.includes("-and-")) set.add(base.replace("-and-", "-"));
  if (!base.includes("-and-")) set.add(base.replace("-", "-and-"));
  return Array.from(set);
}

// Cloudflare Images URL helper (served via CDN)
const CF = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH || "pJ0fKvjCAbyoF8aD0BGu8Q"; // set yours in env
function cfImageUrl(id: string, variant = "public") {
  return `https://imagedelivery.net/${CF}/${id}/${variant}`;
}

/* -----------------------------------------------------------
   3) Normalize raw JSON into typed collections
   ----------------------------------------------------------- */
// Categories: build a proper slug-keyed record
const categoryRows = categoryAssetsRaw as unknown as RawCategoryRow[];
const categoryMap: Record<string, CategoryAsset> = {};
for (const r of categoryRows) {
  const slug = norm(r.slug || r.name || (r.id != null ? String(r.id) : ""));
  if (!slug) continue;
  categoryMap[slug] = {
    imageId: r.cf_image_id ?? undefined,
    variant: r.cf_image_variant ?? undefined,
    imageUrl: r.image_url ?? undefined,
    description: r.description ?? undefined,
  };
}

const subcategoryAssets = subcategoryAssetsRaw as unknown as SubcategoryAsset[];
const productAssets = productAssetsRaw as unknown as ProductAsset[];
const images = imagesRaw as unknown as ImageAsset[]; // remove if not used

/* -----------------------------------------------------------
   4) Merge functions (defensive)
   ----------------------------------------------------------- */

/** Merge a SinaLite category with local asset by slug (or id fallback). */
export function mergeCategory(apiCat: { id?: string | number; slug?: string; [k: string]: any }) {
  // try slug, alternates, then id
  let asset: CategoryAsset | undefined;
  if (apiCat.slug) {
    const s = norm(apiCat.slug);
    for (const key of [s, ...alternates(s)]) {
      asset = categoryMap[key];
      if (asset) break;
    }
  }
  if (!asset && apiCat.id != null) {
    asset = categoryMap[norm(String(apiCat.id))];
  }

  const image =
    asset?.imageId ? cfImageUrl(asset.imageId, asset.variant || "public") : asset?.imageUrl;

  return {
    ...apiCat,
    description: asset?.description ?? apiCat.description,
    image,
  };
}

/** Merge a SinaLite subcategory with local subcategory record by id or slug. */
export function mergeSubcategory(apiSub: { id?: number | string; slug?: string; [k: string]: any }) {
  const idStr = apiSub.id != null ? String(apiSub.id) : null;
  const slug = apiSub.slug ? norm(apiSub.slug) : null;

  const asset =
    subcategoryAssets.find((s) => (s.id != null && String(s.id) === idStr) || (s.slug && norm(s.slug) === slug)) ||
    undefined;

  const image = asset?.cloudflare_image_id ? cfImageUrl(asset.cloudflare_image_id, "productCard") : undefined;

  return {
    ...apiSub,
    name: apiSub.name ?? asset?.name ?? apiSub.slug ?? apiSub.id,
    description: apiSub.description ?? asset?.description,
    image,
  };
}

/** Merge a SinaLite product with local asset/image by product_id or matched_sku. */
export function mergeProduct(apiProd: { id?: number; sku?: string; [k: string]: any }) {
  const id = apiProd.id != null ? Number(apiProd.id) : null;
  const sku = apiProd.sku ? String(apiProd.sku) : null;

  const asset =
    productAssets.find(
      (p) => (p.product_id != null && Number(p.product_id) === id) || (p.matched_sku && p.matched_sku === sku)
    ) || undefined;

  const imageAsset =
    images.find(
      (img) => (img.product_id != null && Number(img.product_id) === id) || (img.matched_sku && img.matched_sku === sku)
    ) || undefined;

  const cloudflareId = asset?.cloudflare_id || imageAsset?.cloudflare_id;
  const image = cloudflareId ? cfImageUrl(cloudflareId, "productCard") : undefined;

  return {
    ...apiProd,
    // prefer productAsset name if API name is missing
    name: apiProd.name ?? asset?.name ?? apiProd.sku ?? apiProd.id,
    image,
    // harmless UI defaults until you wire reviews source
    rating: typeof apiProd.rating === "number" ? apiProd.rating : 4.8,
    reviewCount: typeof apiProd.reviewCount === "number" ? apiProd.reviewCount : 238,
  };
}
