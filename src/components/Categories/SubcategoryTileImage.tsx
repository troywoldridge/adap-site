// src/components/Categories/SubcategoryTileImage.tsx
"use client";

import * as React from "react";
import { cfImage } from "@/lib/cfImages";

// Infer the precise union for cfImage's variant arg
type Variant = Parameters<typeof cfImage>[1];

/**
 * SubcategoryTileImage
 * - SAME behavior as CategoryCardImage, name kept for existing imports
 * - Absolutely NO index/id captions or overlays
 * - Images delivered via Cloudflare Images CDN
 */
type Props = {
  src: string;                 // Cloudflare image id when kind="id", or absolute/relative URL when kind="url"
  kind?: "id" | "url";         // "id" = Cloudflare Images ID (recommended), "url" = already-built URL
  alt?: string;
  variant?: Variant;           // e.g. "productCard" | "subcategoryThumb" | "public" | ...
  className?: string;
  sizes?: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "auto" | "sync";
  draggable?: boolean;
  fetchPriority?: "high" | "low" | "auto";
};

export default function SubcategoryTileImage({
  src,
  kind = "id",
  alt = "",
  variant,
  className = "w-full h-full object-cover",
  sizes = "(max-width: 768px) 100vw, 25vw",
  loading = "lazy",
  decoding = "async",
  draggable = false,
  fetchPriority = "auto",
}: Props) {
  // Provide a safe default variant that exists in your cfImage variants
  const v: Variant | undefined = variant ?? ("productCard" as Variant);

  const url = kind === "id" ? cfImage(src, v) : src;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={className}
      sizes={sizes}
      loading={loading}
      decoding={decoding}
      draggable={draggable}
      fetchPriority={fetchPriority}
    />
  );
}
