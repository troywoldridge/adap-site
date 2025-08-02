// src/components/Hero.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";

interface Slide {
  id: string;
  imageUrl: string;
  alt: string;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
}

const defaultSlides: Slide[] = [
  {
    id: "promo-group-3",
    imageUrl:
      "https://imagedelivery.net/pJ0fKvjCAbyoF8aD0BGu8Q/0fb1e21b-a3ad-4b1a-dcda-431ff3d46a00/public",
    alt: "Premium custom print products group display",
    title: "Print with Impact",
    description:
      "From business cards to signage, get high-quality prints that make your brand unforgettable. Fast turnaround, bold results.",
    ctaText: "Shop All Products",
    ctaHref: "/products",
  },
  {
    id: "metallic-foil-greeting-cards",
    imageUrl:
      "https://imagedelivery.net/pJ0fKvjCAbyoF8aD0BGu8Q/6a552bf6-d83d-4e87-3329-07200a8f8c00/public",
    alt: "Metallic foil greeting cards",
    title: "Shine with Metallic Foil",
    description:
      "Delight recipients with luxurious metallic foil greeting cards. Premium finish, unforgettable impressions.",
    ctaText: "Customize Greeting Cards",
    ctaHref: "/category/greeting-cards",
  },
  {
    id: "banners-glossy-vinyl",
    imageUrl:
      "https://imagedelivery.net/pJ0fKvjCAbyoF8aD0BGu8Q/30a4292d-bf6b-4924-1509-bfe341d38f00/public",
    alt: "Glossy vinyl banners",
    title: "Bold Outdoor Banners",
    description:
      "Durable 13oz glossy vinyl banners that grab attention. Weather-resistant, vibrant, and ready to promote your message.",
    ctaText: "Design Your Banner",
    ctaHref: "/category/banners",
  },
  {
    id: "metallic-foil-business-cards",
    imageUrl:
      "https://imagedelivery.net/pJ0fKvjCAbyoF8aD0BGu8Q/f2bddd86-3031-4b86-9696-c264083cdc00/public",
    alt: "Metallic foil business cards",
    title: "Make First Impressions Last",
    description:
      "Stand out with metallic foil business cards—sophistication meets craftsmanship in every detail.",
    ctaText: "Create Business Cards",
    ctaHref: "/category/business-cards",
  },
];

const AUTO_PLAY_INTERVAL = 5000; // 5 seconds

export default function Hero() {
  const [slides, setSlides] = useState<Slide[]>(defaultSlides);
  const [current, setCurrent] = useState(0);
  const timeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startXRef = useRef<number | null>(null);
  const deltaXRef = useRef<number>(0);
  const announcementRef = useRef<HTMLDivElement | null>(null);
  const slideCount = slides.length;

  const resetAutoPlay = useCallback(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setCurrent((prev) => (prev + 1) % slideCount);
    }, AUTO_PLAY_INTERVAL);
  }, [slideCount]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slideCount) % slideCount);
  }, [slideCount]);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slideCount);
  }, [slideCount]);

  const goTo = useCallback(
    (index: number) => {
      setCurrent(index);
    },
    []
  );

  // Fetch dynamic slides; fallback to defaults if fails
  useEffect(() => {
    let cancelled = false;
    async function fetchSlides() {
      try {
        const res = await fetch("/api/hero-slides");
        if (!res.ok) throw new Error("Fetch failed");
        const data: Slide[] = await res.json();
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setSlides(data);
        }
      } catch (err) {
        console.warn("Could not load dynamic hero slides, using defaults.", err);
      }
    }
    fetchSlides();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-play
  useEffect(() => {
    resetAutoPlay();
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [current, resetAutoPlay]);

  // Swipe / drag handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onPointerDown = (e: PointerEvent) => {
      startXRef.current = e.clientX;
      deltaXRef.current = 0;
      container.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (startXRef.current === null) return;
      deltaXRef.current = e.clientX - startXRef.current;
    };

    const onPointerUp = () => {
      if (startXRef.current === null) return;
      const threshold = 50;
      if (deltaXRef.current > threshold) {
        prev();
      } else if (deltaXRef.current < -threshold) {
        next();
      }
      startXRef.current = null;
      deltaXRef.current = 0;
      resetAutoPlay();
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointerleave", onPointerUp);

    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointerleave", onPointerUp);
    };
  }, [prev, next, resetAutoPlay]);

  // Announce slide changes for screen readers
  useEffect(() => {
    if (!announcementRef.current) return;
    const slide = slides[current];
    announcementRef.current.textContent = `Slide ${current + 1} of ${slideCount}: ${slide.title}`;
  }, [current, slides, slideCount]);

  return (
    <section
      aria-label="Hero carousel"
      className="hero-carousel"
      ref={(el) => {
        containerRef.current = el ?? null;
      }}
    >
      {/* Preload first slide image */}
      <link rel="preload" as="image" href={slides[0]?.imageUrl} />

      {/* ARIA live region (visually hidden) */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        ref={(el) => {
          announcementRef.current = el;
        }}
      ></div>

      <div className="slides-wrapper">
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`slide ${idx === current ? "active" : ""}`}
            aria-hidden={idx !== current}
          >
            <div className="image-container">
              <img
                src={slide.imageUrl}
                alt={slide.alt}
                loading={idx === 0 ? "eager" : "lazy"}
                width={1200}
                height={500}
              />
            </div>
            <div className="overlay">
              <div className="text-content">
                <h2>{slide.title}</h2>
                <p>{slide.description}</p>
                <Link href={slide.ctaHref} className="button" aria-label={slide.ctaText}>
                  {slide.ctaText}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="controls">
        <button
          aria-label="Previous slide"
          onClick={() => {
            prev();
            resetAutoPlay();
          }}
          className="control prev"
        >
          ‹
        </button>
        <div className="pager" role="tablist">
          {slides.map((s, i) => (
            <button
              key={s.id}
              aria-label={`Slide ${i + 1}`}
              aria-current={i === current ? "true" : undefined}
              onClick={() => {
                goTo(i);
                resetAutoPlay();
              }}
              className={`dot ${i === current ? "active" : ""}`}
            />
          ))}
        </div>
        <button
          aria-label="Next slide"
          onClick={() => {
            next();
            resetAutoPlay();
          }}
          className="control next"
        >
          ›
        </button>
      </div>
    </section>
  );
}
