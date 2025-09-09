// src/app/categories/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import categoryAssets from "@/data/categoryAssets.json";
import { cfFirst } from "@/lib/cfImages"; // ✅ we only need cfFirst here

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://adapnow.com";

type Category = {
  id: number;
  slug: string;
  name: string;
  cf_image_id?: string | null;
  description?: string | null;
  sort_order?: number | null;
};

export const metadata: Metadata = {
  title: "Shop by Category | American Design And Printing",
  description:
    "Explore top print categories—business cards, large format, labels & packaging, apparel and more. Fast turnaround & trade pricing.",
  alternates: { canonical: "/categories" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function CategoriesIndexPage() {
  const categories: Category[] = (categoryAssets as Category[])
    .slice()
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

  // Build JSON-LD *inside* the component so categories & SITE are in scope
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: categories.map((c: Category, i: number) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      url: `${SITE}/category/${c.slug}`, // ✅ canonical
      image: c.cf_image_id
        ? cfFirst(c.cf_image_id, ["categoryThumb", "category", "hero", "public"])
        : undefined,
    })),
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />

      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold">Shop by Category</h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          Trade-only pricing, fast turnaround, and pro quality across our full print lineup.
        </p>
      </header>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((c: Category) => {
          const img = c.cf_image_id
            ? cfFirst(c.cf_image_id, ["categoryThumb", "category", "hero", "public"])
            : "";

          return (
            <li key={c.slug}>
              <Link
                href={`/category/${c.slug}`} // ✅ canonical
                className="block rounded-xl overflow-hidden bg-white border shadow-sm hover:shadow-md transition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {img ? (
                  <img
                    src={img}
                    alt={c.name}
                    className="w-full aspect-[4/3] object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] bg-gray-100" />
                )}
                <div className="p-4">
                  <div className="font-medium text-gray-900">{c.name}</div>
                  {c.description ? (
                    <p className="text-gray-600 text-sm mt-1">{c.description}</p>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
