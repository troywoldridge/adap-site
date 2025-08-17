// src/lib/r2-url.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

// When running in the browser, prefer NEXT_PUBLIC_ var.
// On the server, prefer R2_PUBLIC_BASE_URL.
const R2_BASE =
  (typeof window === "undefined"
    ? process.env.R2_PUBLIC_BASE_URL
    : (process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL as string | undefined)) || "";

const CLEAN_BASE = R2_BASE.replace(/\/+$/, ""); // strip trailing slash

/** Extract the "key" part after the base, e.g.
 * BASE: https://cdn.adap.com/artwork  URL: https://cdn.adap.com/artwork/uploads/foo.png
 * => key = uploads/foo.png
 */
export function extractR2Key(input: string): string | null {
  if (!input) {
    return null;
  }

  // If caller already passed just a key (no scheme/host), use it directly
  if (!/^https?:\/\//i.test(input)) {
    return input.replace(/^\/+/, ""); // remove leading slash if present
  }

  // If we know the base, strip it
  if (CLEAN_BASE && input.startsWith(CLEAN_BASE)) {
    const key = input.slice(CLEAN_BASE.length).replace(/^\/+/, "");
    return key || null;
  }

  // Otherwise, try to parse and guess the key by chopping off host and the bucket prefix.
  // e.g. https://<account>.r2.cloudflarestorage.com/<bucket>/uploads/foo.png
  try {
    const u = new URL(input);
    const path = u.pathname.replace(/^\/+/, ""); // "<bucket>/uploads/foo.png" or "artwork/uploads/foo.png"
    // If your BASE includes the bucket (e.g. .../artwork), we can’t infer it reliably.
    // Try to strip first segment as bucket.
    const parts = path.split("/");
    if (parts.length >= 2) {
      // remove first segment (bucket)
      parts.shift();
      return parts.join("/");
    }
    return path || null;
  } catch {
    return null;
  }
}

/** Build the proxy URL (/api/r2/<key>) from either a public R2 URL or a raw key */
export function toProxyArtworkUrl(input: string): string {
  if (!input) {
    return "";
  }
  // Already pointing to our proxy?
  if (input.startsWith("/api/r2/")) {
    return input;
  }

  const key = extractR2Key(input);
  if (!key) {
    return input;
  } // fallback: return as-is
  // Ensure no accidental double slashes
  return `/api/r2/${key.replace(/^\/+/, "")}`;
}

/** Map an array of {side,url} to proxy URLs (helper for cart artwork arrays) */
export function mapArtworkArrayToProxy<T extends { side: number; url: string }>(
  arr: T[] | null | undefined
): T[] | null {
  if (!Array.isArray(arr)) {
    return null;
  }
  return arr.map((row) => ({ ...row, url: toProxyArtworkUrl(row.url || "") }));
}
