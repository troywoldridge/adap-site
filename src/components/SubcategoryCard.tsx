"use client";
import Link from "next/link";
import Image from "next/image";
import { useInView } from "react-intersection-observer";
import type { SubcategoryAsset } from "@/lib/mergeUtils"; // or from "@/types/subcategory" if centralized

interface Props {
  subcategory: SubcategoryAsset;
}

export default function SubcategoryCard({ subcategory }: Props) {
  const { ref, inView } = useInView({ threshold: 0.13, triggerOnce: true });

  return (
    <li
      ref={ref}
      className={`subcategory-card fade-in${inView ? " is-visible" : ""}`}
      tabIndex={0}
      aria-label={subcategory.name}
    >
      <Link
        href={`/subcategories/${subcategory.id}`}
        className="block focus:outline-none"
        title={`View all products in ${subcategory.name}`}
      >
        <div className="subcategory-card__image-wrap">
          {subcategory.cloudflare_image_id && (
            <Image
              src={`https://imagedelivery.net/<YOUR_CLOUDFLARE_HASH>/${subcategory.cloudflare_image_id}/public`}
              alt={subcategory.name}
              fill
              className="subcategory-card__image"
              unoptimized
              sizes="(min-width: 600px) 340px, 90vw"
              priority={false}
            />
          )}
        </div>
        <div className="subcategory-card__title">{subcategory.name}</div>
        {subcategory.description && (
          <div className="subcategory-card__desc">{subcategory.description}</div>
        )}
        <span className="subcategory-card__btn">
          Browse &rarr;
        </span>
      </Link>
    </li>
  );
}
