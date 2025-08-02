import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { HeroSlide, isValidSlide } from "@/lib/heroSlides";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_PATH = path.join(DATA_DIR, "hero-slides.json");

// Simple in-memory cache to avoid fs reads on every GET
let cachedSlides: HeroSlide[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 15 * 1000; // 15s

function ensureDataFile(defaults: HeroSlide[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(defaults, null, 2));
  }
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

// Helper to load with caching
function loadSlides(): HeroSlide[] {
  const now = Date.now();
  if (cachedSlides && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSlides;
  }
  try {
    ensureDataFile(defaultSlides);
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const validated: HeroSlide[] = parsed.filter(isValidSlide);
      cachedSlides = validated.length ? validated : defaultSlides;
    } else {
      cachedSlides = defaultSlides;
    }
  } catch (e) {
    console.warn("Failed to read hero slides, using defaults:", e);
    cachedSlides = defaultSlides;
  }
  cacheTimestamp = now;
  return cachedSlides!;
}

export const GET = async () => {
  const slides = loadSlides();
  return NextResponse.json(slides);
};

export const POST = async (req: NextRequest) => {
  // simple shared-secret auth
  const adminKey = req.headers.get("x-admin-key");
  if (!adminKey || adminKey !== process.env.HERO_SLIDES_ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!Array.isArray(body)) {
      throw new Error("Payload must be an array");
    }
    const sanitized: HeroSlide[] = body.filter(isValidSlide);
    if (sanitized.length === 0) {
      return NextResponse.json({ error: "No valid slides provided" }, { status: 400 });
    }

    // Atomic write to temp then rename
    const tmpPath = `${DATA_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(sanitized, null, 2));
    fs.renameSync(tmpPath, DATA_PATH);

    // invalidate cache
    cachedSlides = sanitized;
    cacheTimestamp = Date.now();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to save hero slides:", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
};
