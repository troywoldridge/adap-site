// src/lib/heroSlides.ts
export interface HeroSlide {
  id: string;
  imageUrl: string;
  alt: string;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  blurDataURL?: string; // optional precomputed placeholder
}

// Basic runtime validation (you can swap in zod later)
export function isValidSlide(obj: any): obj is HeroSlide {
  return (
    obj &&
    typeof obj.id === "string" &&
    typeof obj.imageUrl === "string" &&
    typeof obj.alt === "string" &&
    typeof obj.title === "string" &&
    typeof obj.description === "string" &&
    typeof obj.ctaText === "string" &&
    typeof obj.ctaHref === "string"
  );
}
