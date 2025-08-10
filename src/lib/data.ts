// src/lib/data.ts
import slugify from "slugify";
import imagesRaw from "@/data/images.json";

// ---- Types ----
export interface ImageRecord {
  category_id: number;
  subcategory_id: number;
  name: string;               // e.g. "standard_business_cards"
  image_name: string;         // e.g. "business-cards-18pt-matte-silk-lamination_1.webp"
  cloudflare_id: string | null;
  product_id: number;         // 0 means "not tied to a product"
  matched_sku: string | null;
}

export type ImageMap = ImageRecord[];

// ---- Cloudflare image URL helper ----
const CF_BASE =
  process.env.NEXT_PUBLIC_IMAGE_DELIVERY_BASE?.replace(/\/+$/, "") ||
  "https://imagedelivery.net";
const CF_HASH = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH || "";
const CF_VARIANT =
  process.env.NEXT_PUBLIC_CF_IMAGE_VARIANT || "public";

/** Build a Cloudflare Image Delivery URL, or fallback to a relative /images path. */
export function cfUrl(
  cloudflareId: string | null | undefined,
  fallbackImageName?: string
): string {
  if (cloudflareId && CF_HASH) {
    return `${CF_BASE}/${CF_HASH}/${cloudflareId}/${CF_VARIANT}`;
  }
  // Fallback to /images if no CF id
  if (fallbackImageName) {
    return `/images/${fallbackImageName}`;
  }
  return "/images/placeholder.png";
}

// Normalize name to a human label if needed
export function humanizeName(name: string): string {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

// Keep the raw mapping as a typed array
export const imageMap: ImageMap = Array.isArray(imagesRaw)
  ? (imagesRaw as ImageRecord[])
  : [];

// ---- Lookups ----

/** Find the best image for a (categoryId, subcategoryId) pair. */
export function getImageForCategorySubcategory(
  categoryId: number,
  subcategoryId?: number
): { url: string; record: ImageRecord | null } {
  // Try exact match first
  let rec =
    imageMap.find(
      (r) =>
        r.category_id === categoryId &&
        (typeof subcategoryId === "number"
          ? r.subcategory_id === subcategoryId
          : true)
    ) || null;

  // If no exact match w/ subcategory, try any image in the category
  if (!rec && typeof subcategoryId === "number") {
    rec = imageMap.find((r) => r.category_id === categoryId) || null;
  }

  const url = rec ? cfUrl(rec.cloudflare_id, rec.image_name) : cfUrl(null);
  return { url, record: rec };
}

/** Find an image by product_id. */
export function getImageByProductId(
  productId: number
): { url: string; record: ImageRecord | null } {
  const rec = imageMap.find((r) => r.product_id === productId) || null;
  const url = rec ? cfUrl(rec.cloudflare_id, rec.image_name) : cfUrl(null);
  return { url, record: rec };
}

/** Find an image by matched_sku (exact match). */
export function getImageBySku(
  sku: string
): { url: string; record: ImageRecord | null } {
  const rec =
    imageMap.find((r) => (r.matched_sku || "").toLowerCase() === sku.toLowerCase()) ||
    null;
  const url = rec ? cfUrl(rec.cloudflare_id, rec.image_name) : cfUrl(null);
  return { url, record: rec };
}

/** Find an image by the `name` field (e.g., "standard_business_cards"). */
export function getImageByName(
  name: string
): { url: string; record: ImageRecord | null } {
  const rec =
    imageMap.find(
      (r) => r.name.toLowerCase() === name.toLowerCase()
    ) || null;
  const url = rec ? cfUrl(rec.cloudflare_id, rec.image_name) : cfUrl(null);
  return { url, record: rec };
}

/** Slug helper if you need it elsewhere (consistent slug generation). */
export function toSlug(input: string): string {
  return slugify(input, {
    lower: true,
    strict: true,
    trim: true,
  });
}
