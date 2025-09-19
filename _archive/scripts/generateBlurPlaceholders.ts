// scripts/generateBlurPlaceholders.ts
import fs from "fs";
import path from "path";
import sharp from "sharp";
// If you're on Node 18+, you can use global fetch. If not, keep node-fetch:
import fetch from "node-fetch";

// Import the type ONLY; don’t bind the JS module at runtime
import type { HeroSlide as BaseHeroSlide } from "../../src/lib/heroSlides"; // no .js

const DATA_PATH = path.join(process.cwd(), "data", "hero-slides.json");

// Extend the base type with the fields this script reads/writes
type HeroSlide = BaseHeroSlide & {
  id: string | number;          // script uses slide.id in logs
  imageUrl: string;             // script reads slide.imageUrl
  blurDataURL?: string | null;  // script writes/reads this
};

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  // node-fetch returns ArrayBuffer; on Node18 global fetch also returns one
  return Buffer.from(await res.arrayBuffer());
}

function toDataURL(buffer: Buffer, mime: string) {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function generatePlaceholder(imageUrl: string): Promise<string> {
  const buf = await fetchImageBuffer(imageUrl);
  const small = await sharp(buf)
    .resize(20)         // tiny (keeps aspect)
    .blur()             // gaussian blur for nicer placeholder
    .jpeg({ quality: 50 })
    .toBuffer();
  return toDataURL(small, "image/jpeg");
}

async function main() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error("hero-slides.json not found at", DATA_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(DATA_PATH, "utf-8");

  // Trust-but-verify parse; treat as our extended type
  const slides = JSON.parse(raw) as HeroSlide[];
  let updated = false;

  for (const slide of slides) {
    // Basic sanity checks to avoid runtime surprises
    if (!slide?.imageUrl) {
      console.warn(`Skipping slide without imageUrl (id=${String(slide?.id ?? "unknown")})`);
      continue;
    }

    const hasValidDataUrl =
      typeof slide.blurDataURL === "string" && slide.blurDataURL.startsWith("data:");

    if (!hasValidDataUrl) {
      try {
        const placeholder = await generatePlaceholder(slide.imageUrl);
        slide.blurDataURL = placeholder;
        updated = true;
        console.log(`Generated placeholder for ${slide.id}`);
      } catch (e) {
        console.warn(`Failed to generate placeholder for ${slide.id}:`, e);
      }
    }
  }

  if (updated) {
    // Backup then write
    fs.writeFileSync(`${DATA_PATH}.bak`, raw);
    fs.writeFileSync(DATA_PATH, JSON.stringify(slides, null, 2));
    console.log("Updated hero-slides.json with blurDataURL");
  } else {
    console.log("No updates needed");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
