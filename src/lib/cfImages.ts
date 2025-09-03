// src/lib/cfImages.ts
export const CF_HASH = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH ?? "";

// Toggle runtime variant warnings (on by default).
// Set NEXT_PUBLIC_CF_VARIANT_WARN="false" to silence in dev.
const WARN_VARIANTS =
  (process.env.NEXT_PUBLIC_CF_VARIANT_WARN ?? "true").toLowerCase() !== "false";

// Keep in sync with your Cloudflare Images dashboard variants
export type Variant =
  | "hero"
  | "hero2x"            // e.g. width ~2560, q=85
  | "saleCard"
  | "category"
  | "categoryThumb"
  | "subcategoryThumb"
  | "productHero"
  | "productThumb"
  | "productCard"       // ✅ now supported everywhere
  | "public";

/** Registry used for runtime checks */
const VALID_VARIANTS: ReadonlySet<Variant> = new Set<Variant>([
  "hero",
  "hero2x",
  "saleCard",
  "category",
  "categoryThumb",
  "subcategoryThumb",
  "productHero",
  "productThumb",
  "productCard",
  "public",
]);

/** Simple warn-once cache */
const warned = new Set<string>();
function warnOnce(key: string, message: string) {
  if (!WARN_VARIANTS) return;
  if (process.env.NODE_ENV === "production") return;
  if (warned.has(key)) return;
  warned.add(key);
  // eslint-disable-next-line no-console
  console.warn(message);
}

/** True if string is an imagedelivery.net URL */
function isCFUrl(s: string) {
  try {
    const u = new URL(s);
    return u.hostname === "imagedelivery.net";
  } catch {
    return false;
  }
}

/** Extract the last path segment (Cloudflare variant) from a CF URL, if any */
function extractVariantFromCfUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const segs = u.pathname.split("/").filter(Boolean);
    return segs[segs.length - 1] || null;
  } catch {
    return null;
  }
}

/** Assert our outgoing target variant exists; warn in dev if not */
function assertVariant(variant: string) {
  if (!VALID_VARIANTS.has(variant as Variant)) {
    warnOnce(
      `cf-variant:${variant}`,
      `[cfImages] Variant "${variant}" isn't in VALID_VARIANTS. ` +
        `Add it to your Cloudflare Images dashboard & the Variant union to avoid 404s.`
    );
  }
}

/** If caller passes a full CF URL with an unknown variant, warn (non-blocking) */
function maybeWarnIncomingVariant(url: string) {
  const v = extractVariantFromCfUrl(url);
  if (v && !VALID_VARIANTS.has(v as Variant)) {
    warnOnce(
      `incoming-cf-variant:${v}`,
      `[cfImages] Incoming Cloudflare URL uses unknown variant "${v}". ` +
        `We will still swap to your requested variant, but you may want to align dashboards & code.`
    );
  }
}

/** Build Cloudflare Images URL from ID or full imagedelivery URL. */
export function cfImage(
  idOrUrl: string,
  variant: Variant = "public",
  params?: Record<string, string | number>
): string {
  if (!idOrUrl) return "";

  // Runtime assert (warn-only) for the outgoing variant
  assertVariant(variant);

  // Case 1: already a full Cloudflare URL -> swap last segment to our variant
  if (idOrUrl.startsWith("http") && isCFUrl(idOrUrl)) {
    maybeWarnIncomingVariant(idOrUrl);
    const u = new URL(idOrUrl);
    u.pathname = u.pathname.replace(/\/([^/]+)$/, `/${variant}`);
    if (params) for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
    return u.toString();
  }

  // Case 2: other remote URL (S3/R2/whatever) -> passthrough (add params if any)
  if (idOrUrl.startsWith("http")) {
    if (!params) return idOrUrl;
    const pass = new URL(idOrUrl);
    for (const [k, v] of Object.entries(params)) pass.searchParams.set(k, String(v));
    return pass.toString();
  }

  // Case 3: treat as Cloudflare image ID
  if (!CF_HASH) {
    warnOnce(
      "cf-hash-missing",
      "[cfImages] NEXT_PUBLIC_CF_ACCOUNT_HASH is missing; cannot build Cloudflare URL from ID."
    );
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
 * Ensure these variants exist in your Cloudflare Images dashboard.
 */
const TABLES: Record<LoaderPreset, Array<[number, Variant]>> = {
  default: [
    [360, "productThumb"],
    [640, "saleCard"],
    [900, "category"],
    [1400, "hero"],     // desktop
    [99999, "hero2x"],  // very large / retina
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

    // Build Cloudflare URL from image ID (cfImage also asserts variant at runtime)
    const url = cfImage(src, variant);

    // If CF hash was missing or we somehow made an empty URL, better to return src
    return url || src;
  };
}

/** Site-wide default loader if you don't need a specific preset */
export const cloudflareImagesLoader = makeCloudflareLoader("default");
