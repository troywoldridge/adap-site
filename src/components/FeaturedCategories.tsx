// src/components/FeaturedCategories.tsx
"use client";

import Link from "next/link";
import Image from "next/image";

export interface FeaturedCategory {
  slug: string;
  name: string;
  imageUrl: string;
  href: string;
  description?: string;
}

interface Props {
  categories: FeaturedCategory[];
}

export default function FeaturedCategories({ categories }: Props) {
  if (!categories?.length) {
    return null;
  }

  return (
    <ul className="category-grid">
      {categories.map(({ slug, name, imageUrl, href, description }) => (
        <li key={slug} className="category-card">
          <Link href={href} title={name}>
            {/* --- fixed 4:3 ratio wrapper --- */}
            <div className="category-card__image-wrap">
              <Image
                src={imageUrl}
                alt={description || name}
                fill
                sizes="(max-width: 768px) 50vw, 200px"
                className="category-card__image"
                priority={false}
              />
            </div>

            {/* --- title --- */}
            <h3 className="category-card__title">{name}</h3>
          </Link>
        </li>
      ))}
    </ul>
  );
}
