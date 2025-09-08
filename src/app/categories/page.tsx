// src/app/categories/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import categoryAssets from "@/data/categoryAssets.json";
import { cfImage, type Variant as CfVariant } from "@/lib/cfImages";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://adapnow.com";

// tiny helper to satisfy the Variant type
const V = (v: string) => v as unknown as CfVariant;

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
};

export default function CategoriesIndexPage() {
  const categories = (categoryAssets as Category[])
    .slice()
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: categories.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      url: `${SITE}/category/${c.slug}`, // ✅ canonical
      image: c.cf_image_id ? cfImage(c.cf_image_id, V("categoryHero")) : undefined,
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
        {categories.map((c) => {
          const img = c.cf_image_id ? cfImage(c.cf_image_id, V("categoryHero")) : undefined;
          return (
            <li key={c.slug}>
              <Link
                href={`/category/${c.slug}`}  // ✅ canonical
                className="block rounded-xl overflow-hidden bg-white border shadow-sm hover:shadow-md transition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {img ? (
                  <img
                    src={img}
                    alt={c.name}
                    className="w-full aspect-[4/3] object-cover"
                    loading="lazy"
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
