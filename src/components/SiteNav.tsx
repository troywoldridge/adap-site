// src/components/SiteNav.tsx
"use client";

import Link from "next/link";
import categoryAssets from "@/data/categoryAssets.json";

// small helper to slugify when needed
const toSlug = (s?: string | null) =>
  (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type Cat = { id?: number | string | null; slug?: string | null; name?: string | null };

export default function SiteNav() {
  const cats = (categoryAssets as Cat[]) || [];
  // de-dupe and take a reasonable number for the top nav
  const seen = new Set<string>();
  const topCats = cats
    .map((c) => {
      const slug = toSlug(c.slug) || (c.id != null ? String(c.id) : "");
      const name = (c.name?.trim() || slug || "").toString();
      return slug ? { slug, name } : null;
    })
    .filter((x): x is { slug: string; name: string } => !!x && !seen.has(x.slug) && (seen.add(x.slug), true))
    .slice(0, 8); // show first 8; tweak as you like

  return (
    <nav className="bg-blue-600 text-white py-2">
      <ul className="container mx-auto flex flex-wrap gap-4">
        {topCats.map((cat) => (
          <li key={cat.slug}>
            <Link
              // your routes elsewhere use /categories/:categorySlug
              href={`/categories/${cat.slug}`}
              className="hover:underline"
            >
              {cat.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
