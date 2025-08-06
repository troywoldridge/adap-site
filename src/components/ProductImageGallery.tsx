// src/components/ProductImageGallery.tsx
"use client";

import Image from "next/image";

type Props = {
  /** Array of image URLs (e.g. from getImageUrls) */
  images: string[];
  /** Optional alt text for all images (default: “Product image”) */
  altText?: string;
};

export default function ProductImageGallery({
  images,
  altText = "Product image",
}: Props) {
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="flex space-x-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 p-2">
      {images.map((src, idx) => (
        <div
          key={idx}
          className="relative min-w-[10rem] h-40 rounded-md overflow-hidden shadow-md border"
        >
          <Image
            src={src}
            alt={altText}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
            priority={idx === 0}
          />
        </div>
      ))}
    </div>
  );
}
