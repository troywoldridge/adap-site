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
 *  - Static pages
 *  - Each top-level category (/category/:categorySlug)
 *  - Each subcategory (/category/:categorySlug/:subcategorySlug) — derived defensively
 *  - Each known product id (/product/:id)
 *  - /guides + every PDF under /public/guides/**
 *
 * Cloudflare CDN serves images elsewhere; pricing integrations (SinaLite) don’t affect URLs.
 */

const BASE =
  (process.env.NEXT_PUBLIC_SITE_URL ||
    "https://americandesignandprinting.com").replace(/\/+$/, "");

const GUIDES_ROOT = path.join(process.cwd(), "public", "guides");

// small helper for slugifying names
const toSlug = (s?: string | null) =>
  (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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

  // Core static pages
  const staticPages = [
    "/support",
    "/accessibility",
    "/guarantees",
    "/shipping",
    "/turnaround",
    "/quotes",
    "/guides",
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
        p === "/guides" || p === "/careers" ? "weekly" : "monthly",
      priority: p === "/guides" || p === "/careers" ? 0.6 : 0.5,
    })
  );

  /* ---------------- Categories ----------------
     categoryAssets is an ARRAY like:
     { id, slug, name, cf_image_id?, sort_order?, qa_has_image? }
     Emit by slug; if slug missing, fall back to slugified name or id.
  ------------------------------------------------ */
  type Cat = {
    id?: number | string | null;
    slug?: string | null;
    name?: string | null;
  };
  const cats = categoryAssets as unknown as Cat[];
  const seenCatSlugs = new Set<string>();

  for (const c of cats) {
    const slug =
      toSlug(c.slug) || toSlug(c.name) || (c.id != null ? String(c.id) : "");
    if (!slug || seenCatSlugs.has(slug)) continue;
    seenCatSlugs.add(slug);

    out.push({
      url: `${BASE}/category/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  /* ---------------- Subcategories ----------------
     subcategoryAssets is also an ARRAY, but may NOT have {category_id, slug}.
     We’ll try multiple fields:
       - category key: category_slug OR category_id OR categoryId OR parent_slug
         (falls back to slugified category name if present)
       - subcategory slug: slug OR slugified name OR id
     Only emit when BOTH are present.
  ------------------------------------------------- */
  type AnySub = Record<string, unknown>;
  const subs = subcategoryAssets as unknown as AnySub[];

  for (const s of subs) {
    // possible category fields
    const catRaw =
      (s["category_slug"] as string | undefined) ??
      (s["category_id"] as string | number | null | undefined) ??
      (s["categoryId"] as string | number | null | undefined) ??
      (s["parent_slug"] as string | undefined);

    // possible subcategory fields
    const subSlugRaw = (s["slug"] as string | undefined) ?? null;
    const subName = (s["name"] as string | undefined) ?? null;
    const subId = s["id"];

    // derive strings
    const categoryPart =
      toSlug(typeof catRaw === "number" ? String(catRaw) : (catRaw as string)) ||
      toSlug((s["category_name"] as string | undefined) ?? null);

    const subPart =
      toSlug(subSlugRaw) || toSlug(subName) || (subId != null ? String(subId) : "");

    if (!categoryPart || !subPart) continue; // need both to build URL

    out.push({
      url: `${BASE}/category/${categoryPart}/${subPart}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  /* ---------------- Products ---------------- */
  const productIds = new Set<number>();
  (productAssets as Array<{ product_id?: number; id?: number }>).forEach((p) => {
    const id = Number(p.product_id ?? p.id);
    if (Number.isFinite(id) && id > 0) productIds.add(id);
  });
  productIds.forEach((id) => {
    out.push({
      url: `${BASE}/product/${id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  });

  /* ---------------- Guides PDFs ---------------- */
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
