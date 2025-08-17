// src/lib/product-images.ts
import images from "@/data/images.json";
import { cfImageUrl } from "src/lib/cloudflare-image";

type RawImageRow = {
  category_id: number;
  subcategory_id: number;
  name: string;
  image_name: string;
  cloudflare_id: string | null;
  product_id: number | null;
  matched_sku: string | null;
};

export function productImagesForProductId(pid: string, sku?: string): string[] {
  const pidNum = Number(pid);

  const rows = (images as RawImageRow[]).filter((r) => {
    if (Number.isFinite(pidNum) && r.product_id === pidNum) return true;
    if (sku && r.matched_sku && r.matched_sku === sku) return true;
    return false;
  });

  const urls = rows
    .filter((r) => typeof r.cloudflare_id === "string" && r.cloudflare_id.length > 0)
    .map((r) => cfImageUrl(r.cloudflare_id as string, "public"))
    .filter((u): u is string => !!u); // drop nulls if hash missing

  return urls;
}
