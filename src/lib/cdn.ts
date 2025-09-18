/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/cdn.ts
/**
 * Cloudflare CDN helpers:
 * - Optional Image Resizing for public R2 URLs (via /cdn-cgi/image) when enabled.
 * - Artwork thumbs/previews, basic mime checks, and Cloudflare Images url builder.
 *
 * Env:
 *   NEXT_PUBLIC_ENABLE_CF_IMAGE_RESIZE=true | false
 *   NEXT_PUBLIC_R2_PUBLIC_BASE_URL=https://cdn.adap.com      (or your CDN)
 */

const ENABLE_RESIZE =
  (process.env.NEXT_PUBLIC_ENABLE_CF_IMAGE_RESIZE ?? "false").toLowerCase() === "true";

// Public CDN base for R2 (client-safe + server fallback)
const CDN_BASE = (
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASEURL ||
  process.env.R2_PUBLIC_BASE_URL ||
  process.env.R2_PUBLIC_BASEURL ||
  ""
).replace(/\/+$/, "");

export function isImageMime(m: string | null | undefined): boolean {
  if (!m) return false;
  return /^image\/(png|jpe?g|webp|gif|avif|svg\+xml|tiff)$/i.test(m);
}
export function isPdfMime(m: string | null | undefined): boolean {
  if (!m) return false;
  return /^application\/pdf(?:$|;)/i.test(m);
}

function onOurCdn(url: string): boolean {
  try {
    if (!CDN_BASE) return false;
    const u = new URL(url);
    const base = new URL(CDN_BASE);
    return u.origin.toLowerCase() === base.origin.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Build Cloudflare Image Resizing URL only when:
 *  - Feature flag is on, AND
 *  - URL lives on our CDN origin
 */
export function cdnResize(
  url: string,
  opts: {
    width?: number;
    height?: number;
    fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
    quality?: number;
    format?: "auto" | "avif" | "webp" | "jpeg" | "png";
    dpr?: number;
  } = {},
): string {
  if (!ENABLE_RESIZE || !onOurCdn(url)) return url;

  try {
    const u = new URL(url);
    const parts: string[] = [];
    if (opts.width) parts.push(`width=${Math.max(1, Math.floor(opts.width))}`);
    if (opts.height) parts.push(`height=${Math.max(1, Math.floor(opts.height))}`);
    if (opts.fit) parts.push(`fit=${opts.fit}`);
    if (opts.quality) parts.push(`quality=${Math.min(100, Math.max(1, Math.floor(opts.quality)))}`);
    if (opts.format) parts.push(`format=${opts.format}`);
    if (opts.dpr) parts.push(`dpr=${Math.max(1, Math.min(3, Math.floor(opts.dpr)))}`);

    if (!parts.length) return url;

    const pathWithQuery = `${u.pathname}${u.search ?? ""}`;
    return `${u.origin}/cdn-cgi/image/${parts.join(",")}${pathWithQuery}`;
  } catch {
    return url;
  }
}

/** 160×160 square thumb (image → resized | pdf/other → original) */
export function artworkThumbUrl(publicUrl: string, mime?: string | null): string {
  if (mime && isImageMime(mime)) {
    return cdnResize(publicUrl, {
      width: 160,
      height: 160,
      fit: "cover",
      format: "auto",
      quality: 85,
      dpr: 2,
    });
  }
  return publicUrl;
}

/** Larger preview */
export function artworkPreviewUrl(publicUrl: string, mime?: string | null): string {
  if (mime && isImageMime(mime)) {
    return cdnResize(publicUrl, {
      width: 1600,
      height: 1200,
      fit: "contain",
      format: "auto",
      quality: 85,
    });
  }
  return publicUrl;
}

export function safeText(s: any, fallback = ""): string {
  if (typeof s !== "string") return fallback;
  return s.replace(/\s+/g, " ").trim();
}
export function extFromFilename(name?: string | null): string {
  if (!name) return "";
  const m = name.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "";
}

/** Cloudflare Images delivery (served from Cloudflare CDN imagedelivery.net) */
export function cfUrl(imageId: string, variant = "public"): string {
  const account =
    process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH ||
    process.env.NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH ||
    "";
  if (!account) {
    // Safe dev fallback so you can see where it failed
    return `https://imagedelivery.net/__MISSING_ACCOUNT__/${imageId}/${variant}`;
  }
  return `https://imagedelivery.net/${account}/${imageId}/${variant}`;
}

// Re-exports so existing imports continue to work
export { r2PublicUrl } from "./r2Public";
