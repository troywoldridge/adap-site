"use client";

import { useState } from "react";
import Image from "@/components/ImageSafe";

export type ProductGalleryProps = {
  /** Fully-qualified image URLs (Cloudflare imagedelivery.net URLs are perfect) */
  images: string[];
  productName: string;
  className?: string;
};

export default function ProductGallery({ images, productName, className = "" }: ProductGalleryProps) {
  const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];
  const [index, setIndex] = useState(0);

  if (safeImages.length === 0) {
    // graceful empty state
    return (
      <div className={`rounded-2xl border bg-white p-4 ${className}`}>
        <div className="aspect-[4/3] w-full rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-500">
          No images
        </div>
      </div>
    );
  }

  const current = safeImages[Math.min(index, safeImages.length - 1)];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Hero image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-white">
        <Image
          src={current}
          alt={productName}
          fill
          sizes="(max-width: 1024px) 100vw, 720px"
          style={{ objectFit: "cover" }}
          priority
          draggable={false}
        />
      </div>

      {/* Thumbnails */}
      {safeImages.length > 1 && (
        <div className="grid grid-cols-5 gap-2 md:grid-cols-6">
          {safeImages.map((src, i) => {
            const active = i === index;
            return (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => setIndex(i)}
                className={`group relative aspect-square overflow-hidden rounded-lg border transition ${
                  active ? "ring-2 ring-blue-600 border-blue-600" : "border-neutral-200 hover:border-neutral-300"
                }`}
                aria-label={`Show image ${i + 1}`}
              >
                <Image
                  src={src}
                  alt={`${productName} - ${i + 1}`}
                  fill
                  sizes="120px"
                  style={{ objectFit: "cover" }}
                  draggable={false}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
