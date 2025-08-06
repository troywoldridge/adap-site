// src/lib/heroSlides.types.ts

/** A single slide for the homepage hero carousel */
export interface HeroSlide {
  id: string;
  imageUrl: string;
  alt: string;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  /** Optional base64 blur placeholder */
  blurDataURL?: string;
}

/**
 * Type guard for HeroSlide.
 * Ensures required fields are strings, and if blurDataURL is present it's also a string.
 */
export function isValidSlide(obj: any): obj is HeroSlide {
  if (
    typeof obj !== "object" ||
    obj === null ||
    typeof obj.id !== "string" ||
    typeof obj.imageUrl !== "string" ||
    typeof obj.alt !== "string" ||
    typeof obj.title !== "string" ||
    typeof obj.description !== "string" ||
    typeof obj.ctaText !== "string" ||
    typeof obj.ctaHref !== "string"
  ) {
    return false;
  }

  if (
    "blurDataURL" in obj &&
    obj.blurDataURL !== undefined &&
    typeof obj.blurDataURL !== "string"
  ) {
    return false;
  }

  return true;
}
