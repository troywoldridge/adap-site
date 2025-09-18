// src/lib/product-images.ts
// Builds product image URLs using Cloudflare Images, sourced from productAssets.json
// ✅ Uses CF CDN variants; aligns with SinaLite product IDs/SKUs you use elsewhere.

import productAssets from "@/data/productAssets.json";
import { cfImageUrl } from "@/lib/cloudflare-image"; // or: import { cfImage as cfImageUrl } from "@/lib/cfImages";

type ProductRow = {
  id?: number | string;
  sku?: string;
  name?: string;
  cf_image_1_id?: string | null;
  cf_image_2_id?: string | null;
  cf_image_3_id?: string | null;
  cf_image_4_id?: string | null;
  cf_image_id?: string | null;
  [k: string]: unknown;
};

function toNum(n: unknown): number | null {
  if (n == null) return null;
  const v = Number(String(n).trim());
  return Number.isFinite(v) ? v : null;
}

function collectImageIds(p?: ProductRow): string[] {
  if (!p) return [];
  const ids = [
    p.cf_image_1_id,
    p.cf_image_2_id,
    p.cf_image_3_id,
    p.cf_image_4_id,
    p.cf_image_id, // optional single fallback
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = typeof raw === "string" ? raw.trim() : "";
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/** Return Cloudflare image URLs for a product. */
export function productImagesForProductId(
  pid: string | number,
  sku?: string,
  // 👇 default to productCard so listings don’t forget to pass it
  variant: string = "productCard"
): string[] {
  const pidNum = toNum(pid);

  // 1) numeric product id
  let product = (productAssets as ProductRow[]).find((p) => {
    const idNum = toNum(p.id);
    return pidNum !== null && idNum !== null && idNum === pidNum;
  });

  // 2) fallback to SKU
  if (!product && sku) {
    product = (productAssets as ProductRow[]).find(
      (p) => typeof p.sku === "string" && p.sku.trim() === sku
    );
  }

  const imageIds = collectImageIds(product);
  if (imageIds.length === 0) return [];

  // Map IDs -> Cloudflare CDN URLs
  return imageIds
    .map((id) => cfImageUrl(id, variant))
    .filter((u): u is string => typeof u === "string" && !!u);
}

/** Convenience: first/hero image URL (defaults to productHero). */
export function productHeroImageUrl(
  pid: string | number,
  sku?: string,
  variant: string = "productHero"
): string | null {
  const urls = productImagesForProductId(pid, sku, variant);
  return urls.length ? urls[0] : null;
}
