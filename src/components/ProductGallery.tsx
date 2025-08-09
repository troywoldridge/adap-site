"use client";
import Image from "next/image";
import { useState } from "react";

interface Props {
  images: string[];
}

export default function ProductGallery({ images }: Props) {
  const [index, setIndex] = useState(0);
  if (!images?.length) return null;
  return (
    <div className="product-gallery">
      <div className="product-gallery__main">
        <Image
          src={images[index]}
          alt={`Product image ${index + 1}`}
          width={400}
          height={400}
          className="rounded-xl border"
          unoptimized
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="product-gallery__thumbs flex gap-3 mt-4">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`product-gallery__thumb ${index === i ? "is-active" : ""}`}
              tabIndex={0}
            >
              <Image
                src={img}
                alt={`Thumbnail ${i + 1}`}
                width={72}
                height={72}
                className="rounded border"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
