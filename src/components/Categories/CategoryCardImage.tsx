"use client"; // safe either way; this component is tiny and stateless

import * as React from "react";
import { cfImage } from "@/lib/cfImages";

// Infer the exact type of cfImage's 2nd parameter (the variant union)
type Variant = Parameters<typeof cfImage>[1];

/**
 * CategoryCardImage
 * - NEVER shows numbers/ids
 * - Uses Cloudflare Images via cfImage() when kind="id"
 */
type Props = {
  /** Cloudflare image id (when kind="id") or absolute/relative URL (when kind="url") */
  src: string;
  /** "id" = Cloudflare ID (recommended), "url" = already-built URL */
  kind?: "id" | "url";
  /** alt text (please pass descriptive product/category name) */
  alt?: string;
  /** Cloudflare variant to use for "id" (e.g. "subcategoryThumb", "productCard", "public") */
  variant?: Variant;
  className?: string;
  sizes?: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "auto" | "sync";
  draggable?: boolean;
  fetchPriority?: "high" | "low" | "auto";
};

export default function CategoryCardImage({
  src,
  kind = "id",
  alt = "",
  variant, // let cfImage’s default or your runtime guard decide; no loose string typing
  className = "w-full h-full object-cover",
  sizes = "(max-width: 768px) 100vw, 33vw",
  loading = "lazy",
  decoding = "async",
  draggable = false,
  fetchPriority = "auto",
}: Props) {
  // If you want a specific default that is guaranteed valid, set it here:
  const v: Variant | undefined = variant ?? ("subcategoryThumb" as Variant);

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
