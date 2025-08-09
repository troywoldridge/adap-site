// src/lib/mergeUtils.ts

import categoryAssetsRaw from "@/data/categoryAssets.json";
import subcategoryAssetsRaw from "@/data/subcategoryAssets.json";
import productAssetsRaw from "@/data/productAssets.json";
import imagesRaw from "@/data/images.json";

// 1. Asset Types (for your real JSON shape)

export type CategoryAsset = {
  imageId: string;
  variant: string;
  imageUrl: string;
  description: string;
};
export interface SubcategoryAsset {
  id: number;
  category_id: string;
  slug: string;
  name: string;
  description?: string;
  cloudflare_image_id?: string | null;
  created_at?: string;
  updated_at?: string;
}
export interface ProductAsset {
  category_id: string;
  subcategory_id: string;
  name: string;
  image_name: string;
  cloudflare_id: string;
  product_id: number;
  matched_sku: string;
}
export interface ImageAsset {
  category_id: number;
  subcategory_id: number;
  name: string;
  image_name: string;
  cloudflare_id: string;
  product_id: number;
  matched_sku: string;
}

// 2. Typed Imports
const categoryAssets = categoryAssetsRaw as Record<string, CategoryAsset>;
const subcategoryAssets = subcategoryAssetsRaw as SubcategoryAsset[];
const productAssets = productAssetsRaw as ProductAsset[];
const images = imagesRaw as ImageAsset[];

// 3. Cloudflare CDN Helper (replace with your real hash!)
const CLOUDFLARE_HASH = "<YOUR_CLOUDFLARE_HASH>";
function cfImageUrl(cloudflare_id: string, variant = "public") {
  return `https://imagedelivery.net/${CLOUDFLARE_HASH}/${cloudflare_id}/${variant}`;
}

// 4. Merge Functions

/** Merge a Sinalite API category with your local asset map (by slug or id) */
export function mergeCategory(apiCat: { id?: string; slug?: string; [key: string]: any }) {
  const asset =
    (apiCat.slug && categoryAssets[apiCat.slug]) ||
    (apiCat.id && categoryAssets[apiCat.id]) ||
    undefined;
  // asset may contain imageId, variant, imageUrl, description
  return {
    ...apiCat,
    description: asset?.description ?? apiCat.description,
    image:
      asset?.imageId
        ? cfImageUrl(asset.imageId, asset.variant || "public")
        : asset?.imageUrl ?? undefined,
  };
}

/** Merge Sinalite subcategory with your asset array (by id or slug) */
export function mergeSubcategory(apiSub: { id?: number; slug?: string; [key: string]: any }) {
  const asset = subcategoryAssets.find(
    s => s.id == apiSub.id || s.slug == apiSub.slug
  );
  return {
    ...apiSub,
    description: asset?.description ?? apiSub.description,
    image:
      asset?.cloudflare_image_id
        ? cfImageUrl(asset.cloudflare_image_id)
        : undefined,
  };
}

/** Merge Sinalite product with local productAsset and image (by product_id, matched_sku, etc) */
export function mergeProduct(apiProd: { id?: number; sku?: string; [key: string]: any }) {
  const asset =
    productAssets.find(
      p => p.product_id == apiProd.id || p.matched_sku == apiProd.sku
    ) || undefined;
  const imageAsset =
    images.find(
      img => img.product_id == apiProd.id || img.matched_sku == apiProd.sku
    ) || undefined;

  // Prefer productAsset.cloudflare_id, fallback to imageAsset.cloudflare_id
  const cloudflare_id = asset?.cloudflare_id || imageAsset?.cloudflare_id;

  return {
    ...apiProd,
    ...asset,
    image: cloudflare_id
      ? cfImageUrl(cloudflare_id)
      : undefined,
      rating: apiProd.rating || 4.8,         // Sinalite API, your DB, or default
      reviewCount: apiProd.reviewCount || 238
  };
}
