// scripts/generateBlurPlaceholders.ts
import fs from "fs";
import path from "path";
import sharp from "sharp";
import fetch from "node-fetch";
import { HeroSlide } from "../src/lib/heroSlides.js"; // adjust extension if using ts-node or compile

const DATA_PATH = path.join(process.cwd(), "data", "hero-slides.json");

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function toDataURL(buffer: Buffer, mime: string) {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function generatePlaceholder(imageUrl: string): Promise<string> {
  const buf = await fetchImageBuffer(imageUrl);
  const small = await sharp(buf)
    .resize(20) // tiny
    .blur()
    .jpeg({ quality: 50 })
    .toBuffer();
  return toDataURL(small, "image/jpeg");
}

async function main() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error("hero-slides.json not found");
    process.exit(1);
  }

  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  let slides: HeroSlide[] = JSON.parse(raw);
  let updated = false;

  for (const slide of slides) {
    if (!slide.blurDataURL || slide.blurDataURL.startsWith("data:") === false) {
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
    // backup
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
