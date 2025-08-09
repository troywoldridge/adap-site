"use client";
import Link from "next/link";
import Image from "next/image";
import { useInView } from "react-intersection-observer";
import type { Product } from "@/types/product"; // Update this path if needed

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const { ref, inView } = useInView({ threshold: 0.12, triggerOnce: true });

  // Example badges: mark "New", "Bestseller", etc. based on your data or rules!
  // const badge = product.isNew ? "New" : product.isBestseller ? "Bestseller" : undefined;

  return (
    <li
      ref={ref}
      className={`product-card fade-in${inView ? " is-visible" : ""}`}
      tabIndex={0}
      aria-label={product.name}
    >
      <Link
        href={`/products/${product.id}`}
        className="block focus:outline-none"
        title={`View ${product.name}`}
      >
        <div className="product-card__image-wrap">
          {product.image && (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="product-card__image"
              unoptimized
              sizes="(min-width: 600px) 340px, 90vw"
              priority={false}
            />
          )}
        </div>
        <div className="product-card__body">
          <div className="product-card__title">{product.name}</div>
          {product.description && (
            <div className="product-card__desc">{product.description}</div>
          )}
          {/* Uncomment for badges!
          {badge && (
            <span className="product-card__badge">{badge}</span>
          )} */}
        </div>
      </Link>
    </li>
  );
}
