"use client";

import * as React from "react";
import { cfImage } from "@/lib/cfImages";

/**
 * SubcategoryTileImage
 * - SAME behavior as CategoryCardImage, name kept for existing imports
 * - Absolutely NO index/id captions or overlays
 */
type Props = {
  src: string;
  kind?: "id" | "url";
  alt?: string;
  variant?: string;
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
  variant = "productCard",
  className = "w-full h-full object-cover",
  sizes = "(max-width: 768px) 100vw, 25vw",
  loading = "lazy",
  decoding = "async",
  draggable = false,
  fetchPriority = "auto",
}: Props) {
  const url = kind === "id" ? cfImage(src, variant) : src;

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
