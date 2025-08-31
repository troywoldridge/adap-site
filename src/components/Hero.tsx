"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { getHeroSlides, type HeroSlide } from "@/lib/heroSlides";
import { trackHeroImpression, trackHeroClick } from "@/lib/heroAnalytics";
import { cfImage } from "@/lib/cfImages";

const AUTO_PLAY_MS = 7000;

// analytics adapters (safe if not defined)
const trackImp = (id: string | number, ctaText?: string) => {
  try { (trackHeroImpression as unknown as (id: string | number, ctaText?: string) => void)(id, ctaText); } catch {}
};
const trackClk = (id: string | number, ctaText?: string) => {
  try { (trackHeroClick as unknown as (id: string | number, ctaText?: string) => void)(id, ctaText); } catch {}
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

  useEffect(() => { schedule(); return clear; }, [index, schedule]);

  // track visible slide
  useEffect(() => {
    const s = slides[index];
    if (s) trackImp(s.id, (s as any).ctaText);
  }, [index, slides]);

  const goTo = useCallback((i: number) => {
    if (!slides.length) return;
    const len = slides.length;
    setIndex(((i % len) + len) % len);
  }, [slides.length]);

  const prev = () => goTo(index - 1);
  const next = () => goTo(index + 1);

  if (!slides.length) return null;

  const onEnter = () => { hoveringRef.current = true; clear(); };
  const onLeave = () => { hoveringRef.current = false; schedule(); };

  return (
    <section
      className="mx-auto mt-3 max-w-7xl px-4 isolate"
      aria-label="Featured promotions"
      data-hero
    >
      <div
        className="
          relative z-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm
          h-[180px] min-h-[180px] max-h-[180px]
          md:h-[260px] md:min-h-[260px] md:max-h-[260px]
        "
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {slides.map((s, i) => {
          const active = i === index;

          // Build Cloudflare Images variant URL (served via Cloudflare CDN)
          const url = cfImage(s.imageUrl, "hero");

          return (
            <article
              key={s.id}
              className={`pointer-events-none absolute inset-0 z-0 transition-opacity duration-500 ${active ? "opacity-100" : "opacity-0"}`}
              aria-hidden={!active}
              aria-roledescription="slide"
            >
              <Image
                src={cfImage(s.imageUrl, "hero")}   // 👈 change "hero" to whatever the actual variant name is
                alt={s.alt}
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 1024px, 100vw"
                className="object-contain"
              />

              {/* subtle gradient so text stays readable */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-white/80 via-white/30 to-transparent" />

              <div className="relative z-10 flex h-full items-center px-3">
                <div className="pointer-events-auto max-w-sm rounded-md bg-white/85 p-2 shadow">
                  <h1 className="text-[13px] font-extrabold tracking-tight text-slate-900">
                    {s.title}
                  </h1>
                  {s.description && (
                    <p className="mt-0.5 hidden max-w-prose text-[11px] leading-4 text-slate-700 sm:block">
                      {s.description}
                    </p>
                  )}
                  {s.ctaHref && s.ctaText && (
                    <div className="mt-2">
                      <Link
                        href={s.ctaHref}
                        onClick={() => trackClk(s.id, s.ctaText)}
                        className="inline-flex items-center justify-center rounded bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
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
            <button
              type="button"
              onClick={prev}
              aria-label="Previous slide"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              ›
            </button>
          </>
        )}

        {slides.length > 1 && (
          <div
            className="absolute bottom-1.5 left-1/2 z-10 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 shadow"
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
                  className={`h-1.5 rounded-full transition ${active ? "w-4 bg-blue-700" : "w-1.5 bg-gray-400 hover:bg-gray-500"}`}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
