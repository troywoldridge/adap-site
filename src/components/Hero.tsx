"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { getHeroSlides, HeroSlide } from "@/lib/heroSlides";
import { trackHeroImpression, trackHeroClick } from "@/lib/heroAnalytics";

const AUTO_PLAY = 7000;

export default function Hero() {
  const slides = getHeroSlides();
  const [index, setIndex] = useState(0);
  const timer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    timer.current = setTimeout(
      () => setIndex(i => (i + 1) % slides.length),
      AUTO_PLAY
    );
    return () => clearTimeout(timer.current);
  }, [index, slides.length]);

  useEffect(() => {
    trackHeroImpression(slides[index].id);
  }, [index, slides]);

  const goTo = useCallback((i: number) => setIndex(i), []);
  const prev = () => setIndex(i => (i - 1 + slides.length) % slides.length);
  const next = () => setIndex(i => (i + 1) % slides.length);

  if (!slides.length) {
    return null;
  }

  return (
    <section className="hero">
      <div className="container">
        <div className="hero__wrapper">
          {slides.map((s,i) => (
            <article
              key={s.id}
              className={`hero__slide ${i===index? "is-active":""}`}
              aria-hidden={i!==index}
            >
              <Image
                src={s.imageUrl}
                alt={s.alt}
                fill
                className="hero__img"
                priority={i===0}
                sizes="(min-width: 768px) 1000px, 100vw"
              />
              <div className="hero__overlay" />
              <div className="hero__content">
                <h1 className="hero__title">{s.title}</h1>
                <p className="hero__desc">{s.description}</p>
                <Link href={s.ctaHref} className="hero__cta btn-red">
                  {s.ctaText}
                </Link>
              </div>
            </article>
          ))}



          <div className="hero__dots">
            {slides.map((_,i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`hero__dot ${i===index? "is-active":""}`}
                aria-label={`Slide ${i+1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}