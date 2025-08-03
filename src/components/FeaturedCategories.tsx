// src/components/FeaturedCategories.tsx
"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

export interface CategoryCard {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  imageUrl: string;
  blurDataURL?: string;
  alt: string;
}

// ==== CONFIGURE THESE ====
const categories: CategoryCard[] = [
  {
    id: "business-cards",
    title: "Business Cards",
    subtitle: "Make first impressions last",
    href: "/category/business-cards",
    imageUrl:
      "https://imagedelivery.net/pJ0fKvjCAbyoF8aD0BGu8Q/429ea9b2-d570-4e96-606b-690af84c0400/public", // <-- replace with better square/portrait if needed
    blurDataURL: undefined,
    alt: "Sample business cards",
  },
  {
    id: "print-products",
    title: "Print Products",
    subtitle: "Everything from flyers to brochures",
    href: "/category/print-products",
    imageUrl:
      "https://imagedelivery.net/pJ0fKvjCAbyoF8aD0BGu8Q/d4c12bdf-4211-429d-ab6d-761c8fd76500/public",
    blurDataURL: undefined,
    alt: "Various printed products",
  },
  {
    id: "large-format",
    title: "Large Format",
    subtitle: "Bold signs & banners that stand out",
    href: "/category/banners",
    imageUrl:
      "https://imagedelivery.net/pJ0fKvjCAbyoF8aD0BGu8Q/33beb2a1-1aff-439d-2ec6-97956ed1e100/public",
    blurDataURL: undefined,
    alt: "Large vinyl banner",
  },
];

type AnalyticsEvent = {
  type: "category_impression" | "category_click";
  itemId: string;
  timestamp: number;
  receivedAt: string;
};

export default function FeaturedCategories() {
  const seen = useRef<Set<string>>(new Set());
  const queue = useRef<AnalyticsEvent[]>([]);
  const FLUSH_INTERVAL_MS = 5000;
  const flushTimer = useRef<number | null>(null);

  const enqueue = useCallback((event: AnalyticsEvent) => {
    queue.current.push(event);
  }, []);

  const flush = useCallback(() => {
    if (queue.current.length === 0) return;
    const payload = [...queue.current];
    queue.current = [];
    fetch("/api/hero-analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        events: payload.map((e) => ({
          type: e.type,
          slideId: e.itemId, // keeping shape similar to hero analytics
          timestamp: e.timestamp,
          receivedAt: e.receivedAt,
          ctaText: e.type === "category_click" ? undefined : undefined,
        })),
      }),
    }).catch(() => {
      queue.current.unshift(...payload);
    });
  }, []);

  useEffect(() => {
    categories.forEach((cat) => {
      if (!seen.current.has(cat.id)) {
        enqueue({
          type: "category_impression",
          itemId: cat.id,
          timestamp: Date.now(),
          receivedAt: new Date().toISOString(),
        });
        seen.current.add(cat.id);
      }
    });
    flush();
    flushTimer.current = window.setInterval(() => {
      flush();
    }, FLUSH_INTERVAL_MS) as unknown as number;
    return () => {
      if (flushTimer.current !== null) window.clearInterval(flushTimer.current);
      flush();
    };
  }, [enqueue, flush]);

  const handleClick = (id: string) => {
    enqueue({
      type: "category_click",
      itemId: id,
      timestamp: Date.now(),
      receivedAt: new Date().toISOString(),
    });
    flush(); // immediate flush on click
  };

  return (
    <section
      aria-label="Featured categories"
      className="featured-categories"
      style={{ padding: "4rem 0" }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          gap: "1.5rem",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        {categories.map((c, idx) => (
          <Link
            key={c.id}
            href={c.href}
            aria-label={c.title}
            onClick={() => handleClick(c.id)}
            className="category-card"
            style={{
              flex: "1 1 calc(33% - 1rem)",
              minWidth: 260,
              position: "relative",
              borderRadius: 8,
              overflow: "hidden",
              textDecoration: "none",
              color: "inherit",
              background: "white",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              display: "flex",
              flexDirection: "column",
              transition: "transform .3s ease, box-shadow .3s ease",
              willChange: "transform",
              transform: "translateY(0)",
              animation: "fadeInUp .6s ease",
              animationDelay: `${idx * 100}ms`,
            }}
          >
            <div
              style={{
                flex: "0 0 140px",
                position: "relative",
                overflow: "hidden",
                background: "#f5f5f5",
              }}
            >
              <Image
                src={c.imageUrl}
                alt={c.alt}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                style={{ objectFit: "contain" }}
                placeholder={c.blurDataURL ? "blur" : "empty"}
                blurDataURL={c.blurDataURL}
                priority={false}
              />
            </div>
            <div
              style={{
                padding: "1rem 1.25rem",
                flex: "1 1 auto",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 .25rem" }}>{c.title}</h3>
                <p
                  style={{
                    margin: "0 0 .75rem",
                    fontSize: "0.9rem",
                    color: "var(--color-muted)",
                  }}
                >
                  {c.subtitle}
                </p>
              </div>
              <div>
                <span
                  className="button"
                  aria-hidden="true"
                  style={{
                    padding: "8px 16px",
                    fontSize: "0.9rem",
                    boxShadow: "none",
                    display: "inline-block",
                    margin: "0 auto",
                  }}
                >
                  Shop {c.title}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
