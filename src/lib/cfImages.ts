// src/lib/cfImages.ts
export const CF_HASH = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH ?? "";

// Keep in sync with your Cloudflare Images dashboard variants
export type Variant =
  | "hero"
  | "saleCard"
  | "category"
  | "categoryThumb"
  | "subcategoryThumb"
  | "productHero"
  | "productThumb"
  | "public";

/** True if string is an imagedelivery.net URL */
function isCFUrl(s: string) {
  try {
    const u = new URL(s);
    return u.hostname === "imagedelivery.net";
  } catch {
    return false;
  }
}

/** Build Cloudflare Images URL from ID or full imagedelivery URL. */
export function cfImage(
  idOrUrl: string,
  variant: Variant = "public",
  params?: Record<string, string | number>
): string {
  if (!idOrUrl) return "";

  // Case 1: already a full Cloudflare URL -> swap last segment to our variant
  if (idOrUrl.startsWith("http") && isCFUrl(idOrUrl)) {
    const u = new URL(idOrUrl);
    u.pathname = u.pathname.replace(/\/([^/]+)$/, `/${variant}`);
    if (params) for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
    return u.toString();
  }

  // Case 2: other remote URL (S3/R2/whatever) -> just passthrough (add params if any)
  if (idOrUrl.startsWith("http")) {
    if (!params) return idOrUrl;
    const pass = new URL(idOrUrl);
    for (const [k, v] of Object.entries(params)) pass.searchParams.set(k, String(v));
    return pass.toString();
  }

  // Case 3: treat as Cloudflare image ID
  if (!CF_HASH) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[cfImages] NEXT_PUBLIC_CF_ACCOUNT_HASH is missing; cannot build Cloudflare URL from ID."
      );
    }
    // Returning empty will make Next/Image show nothing; prefer to throw a loud URL to spot bugs
    return "";
  }
  const base = `https://imagedelivery.net/${CF_HASH}/${idOrUrl}/${variant}`;
  if (!params) return base;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) q.set(k, String(v));
  return `${base}?${q.toString()}`;
}

/* ----------------------------- Loader presets ----------------------------- */

type LoaderPreset = "default" | "categoryCard" | "subcategoryCard" | "productCard";

/**
 * Threshold tables: [maxWidthInclusive, variant]
 * Make sure variants listed actually exist in your CF dashboard.
 */
const TABLES: Record<LoaderPreset, Array<[number, Variant]>> = {
  default: [
    [360, "productThumb"],
    [640, "saleCard"],
    [900, "category"],
    [1400, "productHero"],
    [99999, "hero"],
  ],
  categoryCard: [
    [240, "categoryThumb"],
    [420, "categoryThumb"],
    [640, "category"],
    [99999, "category"],
  ],
  subcategoryCard: [
    [240, "subcategoryThumb"],
    [420, "subcategoryThumb"],
    [640, "category"],
    [99999, "category"],
  ],
  productCard: [
    [240, "productThumb"],
    [420, "productThumb"],
    [720, "saleCard"],
    [99999, "category"],
  ],
};

/**
 * Create a Next.js <Image> loader that:
 * - Accepts either CF image IDs or full URLs in `src`
 * - Maps the requested width to your Cloudflare variant
 * - Falls back to the original URL unchanged if `src` is already a full URL
 */
export function makeCloudflareLoader(preset: LoaderPreset = "default") {
  const table = TABLES[preset];

  return function cloudflareLoader({
    src,
    width,
  }: {
    src: string;
    width: number;
    quality?: number;
  }) {
    if (!src) return ""; // Nothing to load

    // If src is already a full URL, just return it untouched
    if (src.startsWith("http")) return src;

    // Map width -> variant
    const row = table.find(([max]) => width <= max) ?? table[table.length - 1];
    const variant = row[1];

    // Build Cloudflare URL from image ID
    const url = cfImage(src, variant);

    // If CF hash was missing or we somehow made an empty URL, better to return src
    return url || src;
  };
}

/** Site-wide default loader if you don't need a specific preset */
export const cloudflareImagesLoader = makeCloudflareLoader("default");
