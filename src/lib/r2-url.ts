// src/lib/r2-url.ts
const DEV = process.env.NODE_ENV !== "production";

// Public base (can be http://localhost:3000/artwork in dev)
const R2_PUBLIC_BASEURL = (process.env.R2_PUBLIC_BASEURL || "").replace(/\/+$/, "");

// Optional direct R2 host like xyz.r2.cloudflarestorage.com (no path)
const R2_DIRECT_HOST = (process.env.R2_DIRECT_HOST || "").trim();

const DIRECT_HTTPS = R2_DIRECT_HOST ? `https://${R2_DIRECT_HOST}` : "";

export function toProxyArtworkUrl(input: string): string {
  const raw = String(input || "").trim();
  if (!raw) {
    return "";
  }

  try {
    const u = new URL(raw);

    // If it points at cdn.adap.com (prod CDN) but we're in dev,
    // rewrite to R2_PUBLIC_BASEURL or fall back to DIRECT_HTTPS.
    if (DEV && u.hostname === "cdn.adap.com") {
      if (R2_PUBLIC_BASEURL) {
        return `${R2_PUBLIC_BASEURL}${u.pathname}`;
      }
      if (DIRECT_HTTPS) {
        return `${DIRECT_HTTPS}${u.pathname}`;
      }
    }

    // Otherwise just return it
    return u.toString();
  } catch {
    // Not an absolute URL. If it's already a path like /artwork/..., prefix dev base.
    if (raw.startsWith("/")) {
      if (R2_PUBLIC_BASEURL) {
        return `${R2_PUBLIC_BASEURL}${raw}`;
      }
      if (DIRECT_HTTPS) {
        return `${DIRECT_HTTPS}${raw}`;
      }
      return raw; // last resort
    }
    return raw;
  }
}
