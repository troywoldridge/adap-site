// src/components/product/ProductGallery.tsx
"use client";

import { useMemo, useState } from "react";
import Image from "@/components/ImageSafe";          // wraps next/image safely
import { cfImage } from "@/lib/cfImages";            // Cloudflare Images URL builder
import clsx from "clsx";

/**
 * We accept either:
 * - raw HTTP(S) image URLs (already hosted anywhere), OR
 * - Cloudflare Image IDs to be resolved to CDN URLs.
 *
 * Prefer cfImageIds for fastest delivery via Cloudflare CDN.
 */
export type ProductGalleryProps = {
  /** Primary image Cloudflare ID (preferred) or absolute URL fallback */
  primary?: string | null;
  /** Additional Cloudflare IDs (preferred) or absolute URLs */
  cfImageIds?: (string | null | undefined)[];
  /** Additional absolute image URLs (if not using CF IDs) */
  imageUrls?: (string | null | undefined)[];
  /** Accessible name of the product for alt text */
  productName?: string;
  /** Optional className hooks */
  className?: string;
};

/** Normalize an input string into a final URL using Cloudflare variants when possible. */
function toCdnUrl(input?: string | null, variant?: "galleryHero" | "galleryThumb" | "public"): string | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;

  // Already a full URL? return as-is
  if (/^https?:\/\//i.test(s)) return s;

  // Otherwise treat as a Cloudflare image id
  // Prefer a variant; fall back to "public" then as-is
  return cfImage(s, variant || "public") || cfImage(s, "public") || null;
}

/** Build two arrays: hero (large) + thumb (small) URLs, using CF variants. */
function buildGallerySources(primary?: string | null, cfIds?: (string | null | undefined)[], urls?: (string | null | undefined)[]) {
  const raw: string[] = [];

  if (primary) raw.push(primary);
  for (const id of cfIds || []) if (id) raw.push(id);
  for (const u of urls || []) if (u) raw.push(u);

  // De-dupe while preserving order
  const uniq = Array.from(new Set(raw.map((x) => String(x).trim()).filter(Boolean)));

  const heroUrls: string[] = [];
  const thumbUrls: string[] = [];

  for (const src of uniq) {
    const hero = toCdnUrl(src, "galleryHero") || toCdnUrl(src, "public");
    const thumb = toCdnUrl(src, "galleryThumb") || toCdnUrl(src, "public");
    if (hero) heroUrls.push(hero);
    if (thumb) thumbUrls.push(thumb);
  }

  return { heroUrls, thumbUrls };
}

export default function ProductGallery(props: ProductGalleryProps) {
  const { productName = "Product image", primary = null, cfImageIds = [], imageUrls = [], className } = props;

  const { heroUrls, thumbUrls } = useMemo(
    () => buildGallerySources(primary, cfImageIds, imageUrls),
    [primary, cfImageIds, imageUrls]
  );

  const [index, setIndex] = useState(0);
  const active = heroUrls[index] || heroUrls[0] || null;

  if (!active) {
    // Graceful empty-state (no images)
    return (
      <div className={clsx("rounded-xl border bg-white/60 p-3", className)}>
        <div className="aspect-square w-full rounded-lg bg-neutral-100 ring-1 ring-black/5" />
      </div>
    );
  }

  return (
    <div className={clsx("space-y-3", className)}>
      {/* Main hero image */}
      <div className="overflow-hidden rounded-xl border bg-white ring-1 ring-black/5">
        <Image
          src={active}
          alt={productName}
          width={1200}
          height={1200}
          className="h-auto w-full object-cover"
          // We already serve optimized variants from Cloudflare CDN
          unoptimized
          priority
        />
      </div>

      {/* Thumbnails */}
      {thumbUrls.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {thumbUrls.map((u: string, i: number) => (
            <button
              key={`thumb-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={clsx(
                "relative grid h-16 w-16 place-items-center overflow-hidden rounded-lg border ring-1 ring-black/5 transition",
                i === index ? "border-blue-600 ring-blue-200" : "border-neutral-200 hover:border-neutral-300"
              )}
              aria-label={`View image ${i + 1}`}
            >
              <Image
                src={u}
                alt={`${productName} thumbnail ${i + 1}`}
                width={128}
                height={128}
                className="h-full w-full object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
