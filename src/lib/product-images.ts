// src/lib/product-images.ts
import productAssetsRaw from "@/data/productAssets.json";
import { cfUrl } from "@/lib/data";

type ProductAsset = {
  category_id?: string | number;
  subcategory_id?: string | number;
  name?: string;
  image_name?: string;
  cloudflare_id: string | null; // ID or full URL (cfUrl handles both)
  product_id: number | string;
  matched_sku?: string | null;
};

const productAssets: ProductAsset[] = Array.isArray(productAssetsRaw)
  ? (productAssetsRaw as ProductAsset[])
  : [];

/** Return Cloudflare image URLs for a given product ID (always at least one URL). */
export function productImagesForProductId(productId: number | string): string[] {
  const pid = Number(productId);

  const direct = productAssets
    .filter((a) => Number(a.product_id) === pid && !!a.cloudflare_id)
    .map((a) => cfUrl(a.cloudflare_id!));

  if (direct.length) {
    return Array.from(new Set(direct));
  }

  const any = productAssets.find((a) => !!a.cloudflare_id);
  return any ? [cfUrl(any.cloudflare_id!)] : [cfUrl(null)];
}
