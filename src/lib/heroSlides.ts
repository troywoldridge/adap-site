// src/lib/heroSlides.ts
export type HeroSlide = {
  id: string | number;
  title: string;
  description?: string;
  imageUrl: string;   // Cloudflare Image ID (recommended) or full URL
  alt: string;
  ctaText?: string;
  ctaHref?: string;
  badge?: string;     // optional "SALE", "NEW", etc.
    // 👇 NEW — per-slide controls
  fit?: "cover" | "contain";     // how the image should fill the hero
  focal?: string;   
};

export function getHeroSlides(): HeroSlide[] {
  return [
    {
      id: "business-cards",
      title: "Premium Business Cards",
      description: "Stand out with our top-quality, full-color business cards.",
      // ✅ REPLACE with your Cloudflare Image ID (recommended)
      imageUrl: "https://imagedelivery.net/pJ0fKvjCAbyoF8aD0BGu8Q/2e1a8c28-be09-49f9-1fbc-4b4866bffa00/hero",
      alt: "Premium business cards with embossed details",
      ctaText: "Shop Now",
      ctaHref: "/category/business-cards",
      badge: "Popular",
      fit: "contain",          // try "cover" first for a full-bleed look
      focal: "82% 50%", 
    },
    {
      id: "labels-packaging",
      title: "Labels & Packaging",
      description: "Custom labels, stickers, and packaging solutions.",
      imageUrl: "https://imagedelivery.net/pJ0fKvjCAbyoF8aD0BGu8Q/3c2efbeb-ad0a-459a-61a0-92e6c3f85c00/hero",
      alt: "Stand Up Packaging",
      ctaText: "Explore Packaging",
      ctaHref: "/category/labels",
      badge: "Popular",
      fit: "contain",          // try "cover" first for a full-bleed look
      focal: "90% 50%", 
    },
    
    {
      id: "Large-format",
      title: "Banners & Signs",
      description: "Big, bold, and built for outdoor durability.",
      imageUrl: "https://imagedelivery.net/pJ0fKvjCAbyoF8aD0BGu8Q/a4d26663-cf90-4358-12bf-89c4b746ac00/hero",
      alt: "Outdoor banner display",
      ctaText: "Browse Signs",
      ctaHref: "/category/signs-banners",
      badge: "Popular",
      fit: "contain",          // try "cover" first for a full-bleed look
      focal: "99% 50%", 
    },
  ];
}
