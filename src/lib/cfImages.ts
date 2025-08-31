// src/lib/cfImages.ts
export const CF_HASH = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH ?? "";

/**
 * Keep this list in sync with all the variants you’ve defined in the
 * Cloudflare Images dashboard.
 */
export type Variant =
  | "hero"
  | "saleCard"        // ✅ matches CF dashboard (not sale-card)
  | "category"
  | "productHero"
  | "productThumb"
  | "public";

/**
 * Build a Cloudflare Images URL from either:
 * - a CF image ID (recommended), or
 * - an existing imagedelivery.net URL
 * Optionally append query params (?quality=85 etc).
 */
export function cfImage(
  idOrUrl: string,
  variant: Variant = "public",
  params?: Record<string, string | number>
): string {
  if (!idOrUrl) return "";

  // Full imagedelivery.net URL — swap the variant segment
  if (idOrUrl.startsWith("http")) {
    try {
      const u = new URL(idOrUrl);
      if (u.hostname === "imagedelivery.net") {
        u.pathname = u.pathname.replace(/\/([^/]+)$/, `/${variant}`);
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            u.searchParams.set(k, String(v));
          }
        }
        return u.toString();
      }
      // Non-CF URL: just passthrough
      if (params) {
        const pass = new URL(idOrUrl);
        for (const [k, v] of Object.entries(params)) {
          pass.searchParams.set(k, String(v));
        }
        return pass.toString();
      }
      return idOrUrl;
    } catch {
      // fall through to ID format if parsing failed
    }
  }

  // Treat as Cloudflare image ID
  const base = `https://imagedelivery.net/${CF_HASH}/${idOrUrl}/${variant}`;
  if (!params) return base;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) q.set(k, String(v));
  return `${base}?${q.toString()}`;
}

