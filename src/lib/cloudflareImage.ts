// lib/cloudflareImage.ts
export const CLOUDFLARE_DELIVERY_URL =
  process.env.CLOUDFLARE_DELIVERY_URL ??
  "https://imagedelivery.net/pJ0fKvjCAbyoF8aD0BGu8Q";

export function cfImageUrl(
  imageId?: string,
  variant: string = "public"
): string | undefined {
  if (!imageId) {
    return undefined;
  }
  return `${CLOUDFLARE_DELIVERY_URL}/${imageId}/${variant}`;
}
