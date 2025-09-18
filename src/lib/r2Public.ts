// src/lib/r2Public.ts
// Public URL helpers for artwork served via Cloudflare R2 (through your CDN).

function readFirst(keys: string[]): string {
  for (const k of keys) {
    const v = (process.env as Record<string, string | undefined>)[k];
    if (v && v.trim()) return v.trim();
  }
  return "";
}

/** Accept client-safe (NEXT_PUBLIC_*) and server envs. */
const BASE = readFirst([
  "NEXT_PUBLIC_R2_PUBLIC_BASE_URL",
  "NEXT_PUBLIC_R2_PUBLIC_BASEURL",
  "R2_PUBLIC_BASE_URL",
  "R2_PUBLIC_BASEURL",
]).replace(/\/+$/, "");

/** Return the configured CDN base (or empty string if not set). */
export function getR2PublicBaseUrl(): string {
  return BASE;
}

/** Best-effort host for optimizer bypass / diagnostics. */
export function getR2PublicHost(): string | null {
  if (!BASE) return null;
  try {
    const u = new URL(BASE);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Return a fully-qualified public URL for a given key or URL. */
export function r2PublicUrl(pathOrUrl: string): string {
  const raw = String(pathOrUrl || "").trim();
  if (!raw) return raw;

  // Absolute URL? Return as-is (normalize protocol-relative).
  if (/^(https?:)?\/\//i.test(raw)) return raw.startsWith("//") ? `https:${raw}` : raw;

  // Root-relative path → join with BASE if available.
  if (raw.startsWith("/")) return BASE ? `${BASE}${raw}` : raw;

  // Plain key → require BASE to construct.
  return BASE ? `${BASE}/${raw.replace(/^\/+/, "")}` : raw;
}

/** Optional helper: currently returns same as r2PublicUrl (future: variants) */
export function artworkThumbUrl(pathOrUrl: string): string {
  return r2PublicUrl(pathOrUrl);
}

export function isPdfMime(m?: string | null) {
  return !!m && /^application\/pdf(?:$|;)/i.test(m);
}
export function safeText(s?: string | null) {
  return (s || "").replace(/\s+/g, " ").trim();
}
