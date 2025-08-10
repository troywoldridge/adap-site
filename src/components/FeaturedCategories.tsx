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
  limit?: number; // NEW
}

export default function FeaturedCategories({ categories, limit = 2 }: Props) {
  if (!categories?.length) {
    return null;
  }

  const items = categories.slice(0, limit); // ✅ only render up to limit

  return (
    <ul className="category-grid">
      {items.map(({ slug, name, imageUrl, href, description }) => (
        <li key={slug} className="category-card">
          <Link href={href} title={name}>
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
            <h3 className="category-card__title">{name}</h3>
          </Link>
        </li>
      ))}
    </ul>
  );
}
