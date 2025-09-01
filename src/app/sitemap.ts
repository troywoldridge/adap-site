// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import path from "node:path";
import { promises as fsp } from "node:fs";

import categoryAssets from "@/data/categoryAssets.json";
import subcategoryAssets from "@/data/subcategoryAssets.json";
import productAssets from "@/data/productAssets.json";

/**
 * Builds a complete sitemap:
 *  - Home
 *  - Static pages: support, accessibility, guarantees, shipping, turnaround, quotes
 *  - NEW footer pages: about, reviews, terms, privacy, contact, careers
 *  - Each top-level category (/category/:categorySlug)
 *  - Each subcategory (/category/:categorySlug/:subcategorySlug)
 *  - Each known product id from productAssets.json (/product/:id)
 *  - /guides landing page
 *  - Every PDF under /public/guides/**
 *
 * Uses NEXT_PUBLIC_SITE_URL when set; falls back to your live domain.
 *
 * Note: Fulfillment/pricing integrations (Sinalite) don’t affect sitemap URLs,
 * but see /mnt/data/sinalite_documentation.txt for reference in your project.
 */

const BASE =
  (process.env.NEXT_PUBLIC_SITE_URL ||
    "https://americandesignandprinting.com").replace(/\/+$/, "");

const GUIDES_ROOT = path.join(process.cwd(), "public", "guides");

async function walkGuides(
  dirAbs: string,
  rel = ""
): Promise<{ href: string; mtime: Date }[]> {
  const out: { href: string; mtime: Date }[] = [];
  let entries: import("node:fs").Dirent[] = [];
  try {
    entries = await fsp.readdir(dirAbs, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const e of entries) {
    if (e.name.startsWith(".")) continue; // ignore hidden/system files
    const abs = path.join(dirAbs, e.name);
    const relPath = path.posix.join(rel, e.name.replaceAll("\\", "/"));

    if (e.isDirectory()) {
      out.push(...(await walkGuides(abs, relPath)));
    } else if (e.isFile() && /\.pdf$/i.test(e.name)) {
      try {
        const stat = await fsp.stat(abs);
        out.push({ href: `/guides/${relPath}`, mtime: stat.mtime });
      } catch {
        // ignore stat errors
      }
    }
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const out: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  // Core static pages (existing)
  const staticPages = [
    "/support",
    "/accessibility",
    "/guarantees",
    "/shipping",
    "/turnaround",
    "/quotes",
    "/guides", // keep explicit entry for the landing page

    // ── NEW footer pages ───────────────────────────────────────────
    "/about",
    "/reviews",
    "/terms",
    "/privacy",
    "/contact",
    "/careers",
  ];

  staticPages.forEach((p) =>
    out.push({
      url: `${BASE}${p}`,
      lastModified: now,
      changeFrequency:
        p === "/guides" ? "weekly" : p === "/careers" ? "weekly" : "monthly",
      priority: p === "/guides" ? 0.6 : p === "/careers" ? 0.6 : 0.5,
    })
  );

  // Categories (keys of categoryAssets.json)
  const catObj = categoryAssets as Record<string, unknown>;
  Object.keys(catObj).forEach((categorySlug) => {
    out.push({
      url: `${BASE}/category/${categorySlug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  });

  // Subcategories (array with category_id + slug)
  (subcategoryAssets as Array<{ category_id: string; slug: string }>).forEach(
    (s) => {
      if (!s?.category_id || !s?.slug) return;
      out.push({
        url: `${BASE}/category/${s.category_id}/${s.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  );

  // Products — unique ids from productAssets.json
  const productIds = new Set<number>();
  (productAssets as Array<{ product_id?: number; id?: number }>).forEach(
    (p) => {
      const id = Number(p.product_id ?? p.id);
      if (id && id > 0) productIds.add(id);
    }
  );
  productIds.forEach((id) => {
    out.push({
      url: `${BASE}/product/${id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  });

  // Every PDF under /public/guides/**
  const pdfs = await walkGuides(GUIDES_ROOT);
  pdfs.sort((a, b) => a.href.localeCompare(b.href));
  pdfs.forEach((f) => {
    out.push({
      url: `${BASE}${f.href}`,
      lastModified: f.mtime,
      changeFrequency: "yearly",
      priority: 0.3,
    });
  });

  return out;
}