"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

import { getHeroSlides, HeroSlide } from "@/lib/heroSlides";
import { trackHeroImpression, trackHeroClick } from "@/lib/heroAnalytics";

const AUTO_PLAY = 7000; // ms

export default function Hero() {
  /* 1️⃣  Load & memoise slides ------------------------------------------- */
  const slides: HeroSlide[] = getHeroSlides();
  if (!slides.length) return null;

  /* 2️⃣  Carousel state / autoplay --------------------------------------- */
  const [index, setIndex] = useState(0);
  const timer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    timer.current = setTimeout(
      () => setIndex((i) => (i + 1) % slides.length),
      AUTO_PLAY
    );
    return () => clearTimeout(timer.current);
  }, [index, slides.length]);

  /* analytics - very lightweight */
  useEffect(() => {
    trackHeroImpression(slides[index].id);
  }, [index, slides]);

  /* 3️⃣  Navigation helpers ---------------------------------------------- */
  const goTo  = useCallback((i: number) => setIndex(i), []);
  const prev  = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const next  = () => setIndex((i) => (i + 1) % slides.length);

  /* 4️⃣  Mark-up ---------------------------------------------------------- */
  return (
    <section className="hero">
      <div className="hero__carousel">
        {slides.map((s, i) => (
          <article
            key={s.id}
            className={`hero__slide ${i === index ? "is-active" : ""}`}
            aria-hidden={i !== index}
          >
            {/* Image */}
            <Image
              src={s.imageUrl}
              alt={s.alt}
              fill
              sizes="100vw"
              className="hero__img"
              priority={i === 0}
            />

            {/* Dark overlay for text legibility  */}
            <div className="hero__overlay" />

            {/* Text block */}
            <div className="hero__content">
              <h1 className="hero__title">{s.title}</h1>
              <p className="hero__desc">{s.description}</p>
              <Link
                href={s.ctaHref}
                className="btn-red"
                onClick={() => trackHeroClick(s.id, s.ctaText)}
              >
                {s.ctaText}
              </Link>
            </div>
          </article>
        ))}

        {/* arrows */}
        <button
          className="hero__arrow hero__arrow--prev"
          aria-label="Previous slide"
          onClick={prev}
        >
          ‹
        </button>
        <button
          className="hero__arrow hero__arrow--next"
          aria-label="Next slide"
          onClick={next}
        >
          ›
        </button>

        {/* dots */}
        <div className="hero__dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`hero__dot ${i === index ? "is-active" : ""}`}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
