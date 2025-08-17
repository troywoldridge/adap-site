// src/lib/cloudflare-image.ts

// Accept your keys first, but also tolerate common alternates
const HASH_KEYS = [
  "NEXT_PUBLIC_CF_ACCOUNT_HASH",                 // ✅ your key
  "NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH",
  "NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH",
  "NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH",
  "CF_IMAGES_ACCOUNT_HASH",
];

const VARIANT_KEYS = [
  "NEXT_PUBLIC_CF_IMAGE_VARIANT",                // ✅ your key
  "NEXT_PUBLIC_CF_IMAGES_DEFAULT_VARIANT",
];

const BASE_KEYS = [
  "NEXT_PUBLIC_IMAGE_DELIVERY_BASE",             // ✅ your key (e.g. https://imagedelivery.net)
  "NEXT_PUBLIC_CF_IMAGE_BASE",
];

function readFirst(keys: string[]): string | null {
  for (const k of keys) {
    const v = (process.env as Record<string, string | undefined>)[k];
    if (v && v.trim()) return v.trim();
  }
  return null;
}

const ACCOUNT_HASH = readFirst(HASH_KEYS);
const BASE = readFirst(BASE_KEYS) || "https://imagedelivery.net";
const DEFAULT_VARIANT = readFirst(VARIANT_KEYS) || "public";

// In dev: log a clear warning but DON'T throw (don’t block your page render)
if (!ACCOUNT_HASH && process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line no-console
  console.warn(
    `[cloudflare-image] Missing account hash. Set one of: ${HASH_KEYS.join(", ")}. ` +
      `Using BASE=${BASE}, VARIANT=${DEFAULT_VARIANT}.`
  );
}

/**
 * Build a Cloudflare Images delivery URL.
 * - If `imageId` is already a full URL, return it.
 * - If the account hash is missing, return null so callers can use a fallback image.
 */
export function cfImageUrl(imageId: string, variant?: string): string | null {
  if (!imageId) return null;
  if (/^https?:\/\//i.test(imageId)) return imageId;

  if (!ACCOUNT_HASH) return null; // let caller fall back to placeholder
  const v = (variant || DEFAULT_VARIANT).trim();
  return `${BASE}/${ACCOUNT_HASH}/${imageId}/${v}`;
}
