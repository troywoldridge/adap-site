// src/components/CartArtworkThumb.tsx
"use client";

import Image from "@/components/ImageSafe";
import { cfImage } from "@/lib/cfImages";
import { r2PublicUrl } from "@/lib/r2Public";

type Props = {
  url?: string | null;        // R2 public (absolute or key)
  cfImageId?: string | null;  // if present, serve via Cloudflare Images
  alt?: string;
  className?: string;
};

export default function CartArtworkThumb({
  url,
  cfImageId,
  alt = "Artwork",
  className = "",
}: Props) {
  // Prefer Cloudflare Images if you stored an imageId
  if (cfImageId) {
    const src = cfImage(cfImageId, "productCard");
    if (src) {
      return (
        <div className={`relative h-14 w-14 overflow-hidden rounded border border-neutral-200 ${className}`}>
          <Image src={src} alt={alt} fill sizes="56px" style={{ objectFit: "cover" }} draggable={false} />
        </div>
      );
    }
  }

  const href = url ? r2PublicUrl(url) : "";
  if (href) {
    return (
      <div className={`relative h-14 w-14 overflow-hidden rounded border border-neutral-200 ${className}`}>
        <img
          src={href}
          alt={alt}
          decoding="async"
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex h-14 w-14 items-center justify-center rounded border border-neutral-200 bg-neutral-100 text-xs text-neutral-500 ${className}`}>
      No art
    </div>
  );
}
