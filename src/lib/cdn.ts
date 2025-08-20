/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Cloudflare CDN helpers (feature-flagged transforms)
 * - If ENABLE_CF_IMAGE_RESIZE !== "true", we return the original URL (no /cdn-cgi/image).
 * - If enabled AND the URL is on your CDN origin, we build a resizing URL.
 */

const ENABLE_RESIZE = process.env.ENABLE_CF_IMAGE_RESIZE === "true";

// Public base used by your R2 presign route (e.g. https://cdn.adap.com/artwork)
const CDN_BASE = (process.env.R2_PUBLIC_BASE || process.env.R2_PUBLIC_BASEURL || "").replace(/\/+$/, "");

export function isImageMime(m: string | null | undefined): boolean {
  if (!m) {
    return false;
  }
  return /^image\/(png|jpe?g|webp|gif|avif|svg\+xml|tiff)$/i.test(m);
}
export function isPdfMime(m: string | null | undefined): boolean {
  if (!m) {
    return false;
  }
  return /^application\/pdf$/i.test(m);
}

function onOurCdn(url: string): boolean {
  try {
    if (!CDN_BASE) {
      return false;
    }
    const u = new URL(url);
    return u.origin.toLowerCase() === new URL(CDN_BASE).origin.toLowerCase();
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
  } = {}
): string {
  if (!ENABLE_RESIZE || !onOurCdn(url)) {
    return url;
  }

  try {
    const u = new URL(url);
    const parts: string[] = [];
    if (opts.width) {
      parts.push(`width=${Math.max(1, Math.floor(opts.width))}`);
    }
    if (opts.height) {
      parts.push(`height=${Math.max(1, Math.floor(opts.height))}`);
    }
    if (opts.fit) {
      parts.push(`fit=${opts.fit}`);
    }
    if (opts.quality) {
      parts.push(`quality=${Math.min(100, Math.max(1, Math.floor(opts.quality)))}`);
    }
    if (opts.format) {
      parts.push(`format=${opts.format}`);
    }
    if (opts.dpr) {
      parts.push(`dpr=${Math.max(1, Math.min(3, Math.floor(opts.dpr)))}`);
    }

    if (!parts.length) {
      return url;
    }

    const pathWithQuery = `${u.pathname}${u.search ?? ""}`;
    return `${u.origin}/cdn-cgi/image/${parts.join(",")}${pathWithQuery}`;
  } catch {
    return url;
  }
}

/** 160×160 square thumb (image → resized | pdf/other → original) */
export function artworkThumbUrl(publicUrl: string, mime?: string | null): string {
  if (mime && isImageMime(mime)) {
    return cdnResize(publicUrl, { width: 160, height: 160, fit: "cover", format: "auto", quality: 85, dpr: 2 });
  }
  return publicUrl;
}

/** larger preview */
export function artworkPreviewUrl(publicUrl: string, mime?: string | null): string {
  if (mime && isImageMime(mime)) {
    return cdnResize(publicUrl, { width: 1600, height: 1200, fit: "contain", format: "auto", quality: 85 });
  }
  return publicUrl;
}

export function safeText(s: any, fallback = ""): string {
  if (typeof s !== "string") {
    return fallback;
  }
  return s.replace(/\s+/g, " ").trim();
}
export function extFromFilename(name?: string | null): string {
  if (!name) {
    return "";
  }
  const m = name.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "";
}

// src/lib/cdn.ts
export function cfUrl(imageId: string, variant = "public"): string {
  const account = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH || "";
  // If env is missing, at least return something predictable (helps in dev)
  if (!account) {
    return `https://imagedelivery.net/__MISSING_ACCOUNT__/${imageId}/${variant}`;
  }
  return `https://imagedelivery.net/${account}/${imageId}/${variant}`;
}
