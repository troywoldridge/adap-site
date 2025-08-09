"use client";
import Link from "next/link";
import Image from "next/image";
import { useInView } from "react-intersection-observer";
import type { Category } from "@/types/category";

const categoryIcons: Record<string, React.ReactNode> = {
  "business-cards": "💼",
  "banners": "🖼️",
  "brochures": "📖",
  "postcards": "✉️",
  "flyers": "📰",
  // ...add more!
};

interface Props {
  category: Category;
}

export default function CategoryCard({ category }: Props) {
  const { ref, inView } = useInView({ threshold: 0.12, triggerOnce: true });
  const icon = categoryIcons[category.slug] || "🖨️";

  return (
    <li
      ref={ref}
      className={`category-card fade-in${inView ? " is-visible" : ""}`}
      tabIndex={0}
    >
      <Link href={`/categories/${category.id}`} className="block focus:outline-none">
        <div className="category-card__image-wrap">
          {category.image && (
            <Image
              src={category.image}
              alt={category.name}
              fill
              className="category-card__image"
              unoptimized
              sizes="(min-width: 600px) 360px, 90vw"
              priority={false}
            />
          )}
        </div>
        <div className="category-card__title">
          <span className="category-card__icon" aria-hidden="true" style={{ fontSize: "1.6rem", marginRight: 8 }}>
            {icon}
          </span>
          {category.name}
        </div>
      </Link>
    </li>
  );
}
