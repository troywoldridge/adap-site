// src/lib/data.ts
import slugify from "slugify";
import imagesRaw from "@/data/images.json";

// ---- Types ----
export interface ImageRecord {
  category_id: number;
  subcategory_id: number;
  name: string;               // e.g. "standard_business_cards"
  image_name: string;         // e.g. "business-cards-18pt-matte-silk-lamination_1.webp"
  cloudflare_id: string | null; // either a bare CF Images ID or (historically) a full URL
  product_id: number;         // 0 means "not tied to a product"
  matched_sku: string | null;
}

export type ImageMap = ImageRecord[];

// ---- Cloudflare image URL helper ----
// Per SinaLite doc flow we serve via Cloudflare Images (CDN).
const CF_BASE   = (process.env.NEXT_PUBLIC_IMAGE_DELIVERY_BASE ?? "https://imagedelivery.net").replace(/\/+$/, "");
const CF_HASH   = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH ?? "";
const CF_VARIANT = process.env.NEXT_PUBLIC_CF_IMAGE_VARIANT ?? "public";

// Guaranteed placeholder (allowed in CSP + next/image remotePatterns)
export const PLACEHOLDER = "https://placehold.co/800x600?text=Image+Coming+Soon";

/** Build a Cloudflare Image Delivery URL, accept full URLs, or return placeholder. */
export function cfUrl(
  cloudflareId?: string | null,
  variant: string = CF_VARIANT
): string {
  const id = (cloudflareId ?? "").trim();
  if (!id) {
    return PLACEHOLDER;
  }

  // Already a full URL? just use it.
  if (/^https?:\/\//i.test(id)) {
    return id;
  }

  // Otherwise treat as CF Images ID
  return CF_HASH ? `${CF_BASE}/${CF_HASH}/${id}/${variant}` : PLACEHOLDER;
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
  // 1) exact match on category + subcategory (when provided)
  let rec =
    imageMap.find(
      (r) =>
        r.category_id === categoryId &&
        (typeof subcategoryId === "number" ? r.subcategory_id === subcategoryId : true)
    ) || null;

  // 2) if no subcategory match, try any image in the category
  if (!rec && typeof subcategoryId === "number") {
    rec = imageMap.find((r) => r.category_id === categoryId) || null;
  }

  return { url: cfUrl(rec?.cloudflare_id), record: rec };
}

/** Find an image by subcategory_id (authoritative when your JSON maps it). */
export function getImageBySubcategoryId(
  subcategoryId: number
): { url: string; record: ImageRecord | null } {
  const rec = imageMap.find((r) => r.subcategory_id === subcategoryId) || null;
  return { url: cfUrl(rec?.cloudflare_id), record: rec };
}

/** Find an image by product_id. */
export function getImageByProductId(
  productId: number
): { url: string; record: ImageRecord | null } {
  const rec = imageMap.find((r) => r.product_id === productId) || null;
  return { url: cfUrl(rec?.cloudflare_id), record: rec };
}

/** Find an image by matched_sku (exact match). */
export function getImageBySku(
  sku: string
): { url: string; record: ImageRecord | null } {
  const rec =
    imageMap.find((r) => (r.matched_sku || "").toLowerCase() === sku.toLowerCase()) || null;
  return { url: cfUrl(rec?.cloudflare_id), record: rec };
}

/** Find an image by the `name` field (e.g., "standard_business_cards"). */
export function getImageByName(
  name: string
): { url: string; record: ImageRecord | null } {
  const rec = imageMap.find((r) => r.name.toLowerCase() === name.toLowerCase()) || null;
  return { url: cfUrl(rec?.cloudflare_id), record: rec };
}

/** Consistent slug helper. */
export function toSlug(input: string): string {
  return slugify(input, { lower: true, strict: true, trim: true });
}
