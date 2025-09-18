"use client";

import Image from "@/components/ImageSafe";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { getHeroSlides, type HeroSlide } from "@/lib/heroSlides";
import { trackHeroImpression, trackHeroClick } from "@/lib/heroAnalytics";
import { cloudflareImagesLoader } from "@/lib/cfImages"; // ✅ use the loader (no cfImage import needed)

const AUTO_PLAY_MS = 7000;

// analytics adapters (safe if not defined)
const trackImp = (id: string | number, ctaText?: string) => {
  try {
    (trackHeroImpression as unknown as (id: string | number, ctaText?: string) => void)(id, ctaText);
  } catch {}
};
const trackClk = (id: string | number, ctaText?: string) => {
  try {
    (trackHeroClick as unknown as (id: string | number, ctaText?: string) => void)(id, ctaText);
  } catch {}
};

export default function Hero() {
  const slides: HeroSlide[] = getHeroSlides() ?? [];
  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);
  const hoveringRef = useRef(false);

  const clear = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const schedule = useCallback(() => {
    clear();
    if (!hoveringRef.current && slides.length > 1) {
      timerRef.current = window.setTimeout(
        () => setIndex((i) => (i + 1) % slides.length),
        AUTO_PLAY_MS
      );
    }
  }, [slides.length]);

  useEffect(() => {
    schedule();
    return clear;
  }, [index, schedule]);

  // track visible slide
  useEffect(() => {
    const s = slides[index];
    if (s) trackImp(s.id, (s as any).ctaText);
  }, [index, slides]);

  const goTo = useCallback(
    (i: number) => {
      if (!slides.length) return;
      const len = slides.length;
      setIndex(((i % len) + len) % len);
    },
    [slides.length]
  );

  const prev = () => goTo(index - 1);
  const next = () => goTo(index + 1);

  if (!slides.length) return null;

  const onEnter = () => {
    hoveringRef.current = true;
    clear();
  };
  const onLeave = () => {
    hoveringRef.current = false;
    schedule();
  };

  return (
    <section
      className="mx-auto mt-3 max-w-7xl px-4 isolate"
      aria-label="Featured promotions"
      data-hero
    >
      <div
        className="
          relative z-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm
          h-[220px] min-h-[220px] max-h-[220px]
          md:h-[360px] md:min-h-[360px] md:max-h-[360px]
          lg:h-[440px] lg:min-h-[440px] lg:max-h-[440px]
        "
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
       {slides.map((s, i) => {
  const active = i === index;

  const fit: "cover" | "contain" = "contain";   // 🔒 hard lock
  const focal = (s as any).focal ?? "50% 50%";

  return (
    <article
      key={String(s.id)}
      className={`absolute inset-0 transition-opacity duration-500 ${
        active ? "opacity-100 z-10" : "opacity-0 z-0"
      }`}
      aria-hidden={!active}
      aria-roledescription="slide"
    >
      {/* ambient edge fill (subtle) */}
      <Image
        loader={cloudflareImagesLoader}
        src={(s as any).imageUrl}
        alt=""
        aria-hidden="true"
        fill
        sizes="(min-width:1280px) 1280px, 100vw"
        className="pointer-events-none object-cover scale-[1.02] blur-[2px] opacity-35 saturate-110"
        draggable={false}
        unoptimized 
      />

      {/* real image — never exceeds box */}
      <Image
        loader={cloudflareImagesLoader}
        src={(s as any).imageUrl}
        alt={s.alt}
        fill
        priority={i === 0}
        sizes="(min-width:1280px) 1280px, 100vw"
        className="object-contain object-center"
        style={{ objectPosition: focal }}
        draggable={false}
        unoptimized 
      />

      {/* left contrast gradient */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-full md:w-[55%] bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

      {/* right blend */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden sm:block w-1/3 bg-gradient-to-l from-black/15 to-transparent" />

      {/* caption */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-30 flex w-full md:w-[52%] items-center pl-20 md:pl-28 lg:pl-36 pr-3">
        <div className="pointer-events-auto max-w-2xl">
          {Boolean((s as any).badge) && (
            <span className="mb-2 inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {(s as any).badge}
            </span>
          )}
          <h1 className="text-white drop-shadow-md text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
            {s.title}
          </h1>
          {s.description && (
            <p className="mt-2 text-white/90 drop-shadow text-base sm:text-lg lg:text-xl max-w-prose">
              {s.description}
            </p>
          )}
          {s.ctaHref && s.ctaText && (
            <div className="mt-4">
              <Link
                href={s.ctaHref}
                onClick={() => trackClk(s.id, s.ctaText)}
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
              >
                {s.ctaText}
              </Link>
            </div>
          )}
        </div>
      </div>
    </article>
  );
})}




        {slides.length > 1 && (
          <>
            {/* arrows */}
            <button
              type="button"
              onClick={prev}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-40 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-gray-800 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-40 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-gray-800 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              ›
            </button>

            {/* dots */}
            <div
              className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 shadow"
              role="tablist"
              aria-label="Hero slides"
            >
              {slides.map((_, i) => {
                const active = i === index;
                return (
                  <button
                    key={i}
                    role="tab"
                    aria-selected={active}
                    aria-label={`Go to slide ${i + 1}`}
                    onClick={() => goTo(i)}
                    className={`h-1.5 rounded-full transition ${
                      active ? "w-4 bg-blue-700" : "w-1.5 bg-gray-400 hover:bg-gray-500"
                    }`}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
