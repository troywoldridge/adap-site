// src/lib/cfImages.ts
// Cloudflare Images helpers (served by Cloudflare CDN).
// Supports multiple env var names so legacy builds still work.

// src/lib/cfImages.ts (top of file)
function readFirst(keys: string[]): string {
  for (const k of keys) {
    const v = (process.env as Record<string, string | undefined>)[k];
    if (v && v.trim()) return v.trim();
  }
  return "";
}

export const CF_HASH = readFirst([
  "NEXT_PUBLIC_CF_ACCOUNT_HASH",          // preferred
  "NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH",   // legacy alt
  "NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH",
  "NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH",
  "CF_IMAGES_ACCOUNT_HASH",
]);


const WARN_VARIANTS =
  (process.env.NEXT_PUBLIC_CF_VARIANT_WARN ?? "true").toLowerCase() !== "false";

export type Variant =
  | "hero"
  | "hero2x"
  | "saleCard"
  | "category"
  | "categoryThumb"
  | "subcategoryThumb"
  | "productHero"
  | "productThumb"
  | "productCard" // alias → productThumb
  | "public";

const OUT_VARIANT_MAP: Partial<Record<Variant, Variant>> = {
  productCard: "productThumb",
};

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

const warned = new Set<string>();
function warnOnce(key: string, message: string) {
  if (!WARN_VARIANTS) return;
  if (process.env.NODE_ENV === "production") return;
  if (warned.has(key)) return;
  warned.add(key);
  // eslint-disable-next-line no-console
  console.warn(message);
}

function isCFUrl(s: string) {
  try {
    const u = new URL(s);
    return u.hostname === "imagedelivery.net";
  } catch {
    return false;
  }
}
function extractVariantFromCfUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const segs = u.pathname.split("/").filter(Boolean);
    return segs[segs.length - 1] || null;
  } catch {
    return null;
  }
}
function assertVariant(variant: string) {
  if (!VALID_VARIANTS.has(variant as Variant)) {
    warnOnce(
      `cf-variant:${variant}`,
      `[cfImages] Variant "${variant}" is not in VALID_VARIANTS; add it in CF Images & update the union here.`,
    );
  }
}
function maybeWarnIncomingVariant(url: string) {
  const v = extractVariantFromCfUrl(url);
  if (v && !VALID_VARIANTS.has(v as Variant)) {
    warnOnce(
      `incoming-cf-variant:${v}`,
      `[cfImages] Incoming CF URL used unknown variant "${v}". We'll still swap to your requested variant.`,
    );
  }
}

export function cfImage(
  idOrUrl: string,
  variant: Variant = "public",
  params?: Record<string, string | number>,
): string {
  if (!idOrUrl) return "";

  const outVariant = (OUT_VARIANT_MAP[variant] ?? variant) as Variant;
  assertVariant(outVariant);

  // Full CF URL → swap variant
  if (idOrUrl.startsWith("http") && isCFUrl(idOrUrl)) {
    maybeWarnIncomingVariant(idOrUrl);
    const u = new URL(idOrUrl);
    u.pathname = u.pathname.replace(/\/([^/]+)$/, `/${outVariant}`);
    if (params) for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
    return u.toString();
  }

  // Other absolute URL → pass-through
  if (idOrUrl.startsWith("http")) {
    if (!params) return idOrUrl;
    const pass = new URL(idOrUrl);
    for (const [k, v] of Object.entries(params)) pass.searchParams.set(k, String(v));
    return pass.toString();
  }

  // CF image ID → build
  if (!CF_HASH) {
    warnOnce(
      "cf-hash-missing",
      "[cfImages] Missing Cloudflare account hash. Set NEXT_PUBLIC_CF_ACCOUNT_HASH (or a compatible alias).",
    );
    return "";
  }
  const base = `https://imagedelivery.net/${CF_HASH}/${idOrUrl}/${outVariant}`;
  if (!params) return base;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) q.set(k, String(v));
  return `${base}?${q.toString()}`;
}

export function cfFirst(
  idOrUrl: string | null | undefined,
  variants: Variant[] = ["public"],
  params?: Record<string, string | number>,
): string {
  if (!idOrUrl) return "";
  for (const v of variants) {
    const u = cfImage(idOrUrl, v, params);
    if (u) return u;
  }
  return "";
}

/* ----------------------------- Next.js loaders ----------------------------- */

type LoaderPreset = "default" | "categoryCard" | "subcategoryCard" | "productCard";

const TABLES: Record<LoaderPreset, Array<[number, Variant]>> = {
  default: [
    [360, "productThumb"],
    [640, "saleCard"],
    [900, "category"],
    [1400, "hero"],
    [99999, "hero2x"],
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
    if (!src) return "";
    if (src.startsWith("http")) return src; // absolute (e.g., R2) – pass-through
    const row = table.find(([max]) => width <= max) ?? table[table.length - 1];
    const variant = row[1];
    const url = cfImage(src, variant);
    return url || src;
  };
}

export const cloudflareImagesLoader = makeCloudflareLoader("default");
