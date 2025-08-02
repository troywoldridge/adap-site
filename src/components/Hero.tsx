// src/components/Hero.tsx
"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

export interface HeroSlide {
  id: string;
  imageUrl: string;
  alt: string;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  blurDataURL?: string;
}

const defaultSlides: HeroSlide[] = [
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

const AUTO_PLAY_INTERVAL = 5000;
const IMPRESSION_DEBOUNCE_MS = 500;
const ANALYTICS_FLUSH_INTERVAL = 5000;

type AnalyticsEvent =
  | {
      type: "impression";
      slideId: string;
      timestamp: number;
    }
  | {
      type: "click";
      slideId: string;
      timestamp: number;
      ctaText: string;
    };

// Cloudflare image resize helper (adds width param safely)
function cloudflareResized(src: string, width: number) {
  if (!src) return "";
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}width=${width}&format=auto&quality=75`;
}

export default function Hero() {
  const [slides, setSlides] = useState<HeroSlide[]>(defaultSlides);
  const [current, setCurrent] = useState(0);
  const [targetWidth, setTargetWidth] = useState(1200);
  const timeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startXRef = useRef<number | null>(null);
  const deltaXRef = useRef<number>(0);
  const announcementRef = useRef<HTMLDivElement | null>(null);
  const slideCount = slides.length;

  // analytics state
  const analyticsQueue = useRef<AnalyticsEvent[]>([]);
  const seenImpressions = useRef<Set<string>>(new Set());
  const flushIntervalRef = useRef<number | null>(null);
  const impressionTimer = useRef<number | null>(null);
  const searchParams = useSearchParams();
  const showDebug = searchParams?.get("debug") === "1";

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

  const goTo = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  const enqueueEvent = useCallback((event: AnalyticsEvent) => {
    analyticsQueue.current.push(event);
  }, []);

  const flushAnalytics = useCallback(() => {
    if (analyticsQueue.current.length === 0) return;
    const payload = [...analyticsQueue.current];
    analyticsQueue.current = [];
    void fetch("/api/hero-analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: payload }),
    }).catch((e) => {
      console.warn("Failed to flush hero analytics:", e);
      analyticsQueue.current.unshift(...payload);
    });
  }, []);

  // fetch dynamic slides
  useEffect(() => {
    let canceled = false;
    void fetch("/api/hero-slides")
      .then((r) => {
        if (!r.ok) throw new Error("Fetch failed");
        return r.json();
      })
      .then((data: HeroSlide[]) => {
        if (!canceled && Array.isArray(data) && data.length > 0) {
          setSlides(data);
        }
      })
      .catch(() => {
        /* fallback to defaultSlides */
      });
    return () => {
      canceled = true;
    };
  }, []);

  // autoplay
  useEffect(() => {
    resetAutoPlay();
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [current, resetAutoPlay]);

  // swipe handlers
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
      if (deltaXRef.current > threshold) prev();
      else if (deltaXRef.current < -threshold) next();
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

  // screen reader announcement
  useEffect(() => {
    if (announcementRef.current) {
      const slide = slides[current];
      announcementRef.current.textContent = `Slide ${current + 1} of ${slideCount}: ${slide.title}`;
    }
  }, [current, slides, slideCount]);

  // impression tracking (debounced)
  useEffect(() => {
    if (impressionTimer.current) window.clearTimeout(impressionTimer.current);
    impressionTimer.current = window.setTimeout(() => {
      const slide = slides[current];
      if (!seenImpressions.current.has(slide.id)) {
        enqueueEvent({
          type: "impression",
          slideId: slide.id,
          timestamp: Date.now(),
        });
        seenImpressions.current.add(slide.id);
      }
    }, IMPRESSION_DEBOUNCE_MS);
    return () => {
      if (impressionTimer.current) window.clearTimeout(impressionTimer.current);
    };
  }, [current, slides, enqueueEvent]);

  // periodic analytics flush
  useEffect(() => {
    flushIntervalRef.current = window.setInterval(() => {
      flushAnalytics();
    }, ANALYTICS_FLUSH_INTERVAL) as unknown as number;
    return () => {
      if (flushIntervalRef.current !== null)
        window.clearInterval(flushIntervalRef.current as unknown as number);
      flushAnalytics();
    };
  }, [flushAnalytics]);

  // responsive targetWidth (with DPR)
  useLayoutEffect(() => {
    const update = () => {
      const base = (containerRef.current as HTMLDivElement)?.clientWidth || 1200;
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      setTargetWidth(Math.min(Math.round(base * dpr), 2400));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const onCtaClick = (slide: HeroSlide) => {
    enqueueEvent({
      type: "click",
      slideId: slide.id,
      timestamp: Date.now(),
      ctaText: slide.ctaText,
    });
  };

  return (
    <section
      aria-label="Hero carousel"
      className="hero-carousel"
      ref={(el: HTMLDivElement | null) => {
        containerRef.current = el;
      }}
    >
      {/* Preload first slide image */}
      <link
        rel="preload"
        as="image"
        href={cloudflareResized(slides[0]?.imageUrl || "", targetWidth)}
      />

      {/* ARIA live region */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        ref={(el) => {
          announcementRef.current = el as HTMLDivElement | null;
        }}
      />

      {/* debug badge */}
      {showDebug && (
        <div aria-hidden="true" className="hero-debug-badge">
          {current + 1}/{slideCount} • width: {targetWidth}
        </div>
      )}

      <div
        className="slides-wrapper"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`slide ${idx === current ? "active" : ""}`}
            aria-hidden={idx !== current}
          >
            <div className="slide-inner">
              <div className="text-panel">
                <h2 style={{ margin: 0 }}>{slide.title}</h2>
                <p style={{ margin: "0.5rem 0 1rem" }}>{slide.description}</p>
                <Link
                  href={slide.ctaHref}
                  className="button"
                  aria-label={slide.ctaText}
                  onClick={() => onCtaClick(slide)}
                  style={{ boxShadow: "none" }}
                >
                  {slide.ctaText}
                </Link>
              </div>
              <div className="image-panel">
                {slide.blurDataURL && (
                  <div
                    className="placeholder"
                    aria-hidden="true"
                    style={{ backgroundImage: `url(${slide.blurDataURL})` }}
                  />
                )}
                <Image
                  src={cloudflareResized(slide.imageUrl, targetWidth)}
                  alt={slide.alt}
                  fill
                  sizes="(max-width: 1024px) 50vw, 600px"
                  style={{ objectFit: "contain" }}
                  placeholder={slide.blurDataURL ? "blur" : undefined}
                  blurDataURL={slide.blurDataURL}
                  priority={idx === 0}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* controls */}
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
              aria-label={`Slide ${i + 1}: ${s.title}`}
              aria-current={i === current ? "true" : undefined}
              onClick={() => {
                goTo(i);
                resetAutoPlay();
              }}
              className={`dot ${i === current ? "active" : ""}`}
              role="tab"
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
