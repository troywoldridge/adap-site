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
  limit?: number;
}

export default function FeaturedCategories({ categories, limit = 2 }: Props) {
  if (!categories?.length) {
    return null;
  }

  const items = categories.slice(0, limit);

  return (
    <ul className="featured-category-grid">
      {items.map(({ slug, name, imageUrl, href, description }) => (
        <li key={slug} className="featured-category-card">
          <Link href={href} title={name}>
            <div className="featured-category-card__image-wrap">
              <Image
                src={imageUrl}                       // e.g. https://imagedelivery.net/<HASH>/<ID>/<VARIANT>
                alt={description || name}
                fill
                sizes="(max-width: 768px) 100vw, 480px"
                className="featured-category-card__image"
                priority={false}
              />
            </div>
            <h3 className="featured-category-card__title">{name}</h3>
          </Link>
        </li>
      ))}
    </ul>
  );
}
