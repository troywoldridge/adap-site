// src/lib/product-images.ts
// Builds product image URLs using Cloudflare Images, sourced from productAssets.json
// NOTE: This aligns with SinaLite product IDs/SKUs you use in pricing and product pages.

import productAssets from "@/data/productAssets.json";
import { cfImageUrl } from "src/lib/cloudflare-image";

type ProductRow = {
  id?: number | string;
  sku?: string;
  name?: string;
  // Preferred image columns
  cf_image_1_id?: string | null;
  cf_image_2_id?: string | null;
  cf_image_3_id?: string | null;
  cf_image_4_id?: string | null;
  // Optional single fallback
  cf_image_id?: string | null;
  // Allow extra fields without typing headaches
  [k: string]: unknown;
};

function toNum(n: unknown): number | null {
  if (n == null) return null;
  const v = Number(String(n).trim());
  return Number.isFinite(v) ? v : null;
}

function collectImageIds(p?: ProductRow | undefined): string[] {
  if (!p) return [];
  const ids: (string | null | undefined)[] = [
    p.cf_image_1_id,
    p.cf_image_2_id,
    p.cf_image_3_id,
    p.cf_image_4_id,
    p.cf_image_id, // fallback if present
  ];
  // Clean + de-dupe while preserving order
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

/**
 * Return Cloudflare image URLs for a product.
 * - Tries numeric product `id` first, then `sku`.
 * - Uses variant "public" by default (change if you want "productCard" or others).
 */
export function productImagesForProductId(
  pid: string | number,
  sku?: string,
  variant: string = "public"
): string[] {
  const pidNum = toNum(pid);

  // 1) Try to find by numeric product id
  let product = (productAssets as ProductRow[]).find((p) => {
    const idNum = toNum(p.id);
    return pidNum !== null && idNum !== null && idNum === pidNum;
  });

  // 2) Fallback to SKU match
  if (!product && sku) {
    product = (productAssets as ProductRow[]).find(
      (p) => typeof p.sku === "string" && p.sku === sku
    );
  }

  const imageIds = collectImageIds(product);
  if (imageIds.length === 0) return [];

  // Map to Cloudflare delivery URLs via your loader helper
  const urls = imageIds
    .map((id) => cfImageUrl(id, variant))
    .filter((u): u is string => typeof u === "string" && !!u);

  return urls;
}

/**
 * Convenience: return just the first/hero image URL for a product.
 */
export function productHeroImageUrl(
  pid: string | number,
  sku?: string,
  variant: string = "public"
): string | null {
  const urls = productImagesForProductId(pid, sku, variant);
  return urls.length ? urls[0] : null;
}
