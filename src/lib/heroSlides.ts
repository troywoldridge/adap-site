// src/lib/heroSlides.ts
import rawSlides from "@/data/heroSlides.json";
import type { HeroSlide } from "./heroSlides.types";
import { isValidSlide } from "./heroSlides.types";

let _cache: HeroSlide[] | null = null;

export function getHeroSlides(): HeroSlide[] {
  if (_cache) {
    return _cache;
  }

  // Filter & validate
  const valid = (rawSlides as unknown as any[]).filter(isValidSlide);
  if (valid.length !== (rawSlides as any[]).length) {
    console.warn("Some heroSlides.json entries failed validation");
  }

  _cache = valid;
  return valid;
}

export type { HeroSlide };
