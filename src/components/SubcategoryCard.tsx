"use client";

import Link from "next/link";
import Image from "@/components/ImageSafe";
import { useInView } from "react-intersection-observer";
import type { SubcategoryAsset } from "@/lib/mergeUtils"; // name may be string | null

interface Props {
  subcategory: SubcategoryAsset;
}

const CF = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH || "pJ0fKvjCAbyoF8aD0BGu8Q"; // Cloudflare Images account hash

export default function SubcategoryCard({ subcategory }: Props) {
  const { ref, inView } = useInView({ threshold: 0.13, triggerOnce: true });

  // Defensive coercions (TS + runtime safety)
  const nameStr = (subcategory.name ?? "").toString().trim();
  const ariaLabel: string | undefined = nameStr || undefined; // li aria-label cannot be null
  const titleText = nameStr ? `View all products in ${nameStr}` : "View products";

  const idStr =
    subcategory.id != null ? String(subcategory.id) : ""; // avoid "null" in URL
  const href = idStr ? `/subcategories/${encodeURIComponent(idStr)}` : "#";

  const cfId = subcategory.cloudflare_image_id ?? "";
  const imgUrl = cfId
    ? `https://imagedelivery.net/${CF}/${cfId}/public`
    : "";

  return (
    <li
      ref={ref}
      className={`subcategory-card fade-in${inView ? " is-visible" : ""}`}
      tabIndex={0}
      aria-label={ariaLabel}
    >
      <Link href={href} className="block focus:outline-none" title={titleText}>
        <div className="subcategory-card__image-wrap">
          {imgUrl && (
            <Image
              src={imgUrl}
              alt={nameStr || "Subcategory image"}
              fill
              className="subcategory-card__image"
              unoptimized
              sizes="(min-width: 600px) 340px, 90vw"
              priority={false}
            />
          )}
        </div>

        <div className="subcategory-card__title">
          {nameStr || "Untitled subcategory"}
        </div>

        {subcategory.description && (
          <div className="subcategory-card__desc">{subcategory.description}</div>
        )}

        <span className="subcategory-card__btn">Browse &rarr;</span>
      </Link>
    </li>
  );
}
