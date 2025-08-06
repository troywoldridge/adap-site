// src/components/FeaturedHighlights.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import slugify from "slugify";
import productAssets from "@/data/productAssets.json";

interface ProductAsset {
  id: number;
  name: string;
  slug: string;
  cloudflare_image_id: string | null;
  description: string;
}

interface FeaturedHighlightsProps {
  maxItems?: number;
}

export default function FeaturedHighlights({ maxItems = 3 }: FeaturedHighlightsProps) {
  const assets = (productAssets as unknown as ProductAsset[]).filter((p) => p.cloudflare_image_id);
  const slides = assets
    .slice(0, maxItems)
    .map((p) => {
      const slug = slugify(p.name, { lower: true, strict: true });
      return {
        id: String(p.id),
        title: p.name,
        href: `/products/${p.id}/${slug}`,
        imageUrl: `https://imagedelivery.net/${process.env.NEXT_PUBLIC_CF_ACCOUNT}/${p.cloudflare_image_id}/public`,
        alt: p.description || p.name,
      };
    });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {slides.map((slide) => (
        <Link
          key={slide.id}
          href={slide.href}
          className="block overflow-hidden rounded-lg bg-white shadow hover:shadow-lg transition"
        >
          <div className="relative w-full h-64">
            <Image
              src={slide.imageUrl}
              alt={slide.alt}
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="p-4 text-center">
            <p className="font-semibold text-neutral-900">{slide.title}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
