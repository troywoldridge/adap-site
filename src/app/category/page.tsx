// src/app/categories/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

// ⚙️ Data: use your real category data file
import categoryAssets from "@/data/categoryAssets.json";

// ⚡ Cloudflare Images CDN loader (already in your project)
import { cloudflareImagesLoader, makeCloudflareLoader } from "@/lib/cfImages";

// Prefer the category-tuned preset if you have it; otherwise fall back
const categoryLoader =
  typeof makeCloudflareLoader === "function"
    ? makeCloudflareLoader("categoryCard")
    : cloudflareImagesLoader;

// Only show these 8 categories (by slug)
const FEATURED_SLUGS = [
  "print-products",
  "stationery",
  "promotional",
  "labels-and-packaging",
  "apparel",
  "business-cards",
  "sample-kits",
  "large-format",
] as const;

type CatAsset = {
  imageId?: string;    // Cloudflare Images ID (preferred)
  imageUrl?: string;   // fallback (local/public/remote)
  variant?: string;    // e.g. "public"
  description?: string;
  title?: string;      // optional custom title; otherwise we derive from slug
};

// Build a friendly title from a slug if no title is provided
function titleFromSlug(slug: string) {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ||
    "https://americandesignandprinting.com").replace(/\/+$/, "");
}

export const metadata: Metadata = {
  title: "Shop by Category | American Design And Printing",
  description:
    "Browse our core categories — from print and stationery to labels, apparel, and large format.",
  openGraph: {
    title: "Shop by Category",
    description:
      "Premium print, packaging, apparel, and promo — explore our top categories.",
    url: "/categories",
    type: "website",
  },
  robots: { index: true, follow: true },
};

function CategoriesJsonLd({ slugs }: { slugs: string[] }) {
  const list = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: slugs.map((slug, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteUrl()}/category/${slug}`,
      name: titleFromSlug(slug),
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(list) }}
    />
  );
}

export default function CategoriesPage() {
  // Filter to just the featured slugs, but only include those that exist in the data file
  const items = FEATURED_SLUGS.map((slug) => {
    const raw = (categoryAssets as Record<string, CatAsset | undefined>)[slug];
    if (!raw) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[categories] Missing slug in categoryAssets.json: ${slug}`);
      }
      return null;
    }

    const title = raw.title || titleFromSlug(slug);
    const description =
      raw.description ||
      "Explore products in this category — powered by SinaLite fulfillment (see API docs).";

    // Prefer Cloudflare Image ID (served via CDN variants); fallback to provided URL
    const src = raw.imageId || raw.imageUrl || "";
    const alt = title;

    return { slug, title, description, src };
  }).filter(Boolean) as Array<{ slug: string; title: string; description: string; src: string }>;

  return (
    <main className="container mx-auto max-w-7xl px-4 py-10">
      <CategoriesJsonLd slugs={items.map((i) => i.slug)} />

      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Shop by Category</h1>
        <p className="mt-2 text-slate-600">
          Images ship via <strong>Cloudflare CDN</strong>; pricing & fulfillment use{" "}
          <strong>SinaLite</strong> (see their API docs). Let’s print something awesome!
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <li key={c.slug} className="group">
            <Link
              href={`/category/${c.slug}`}
              className="block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="relative aspect-[3/2] w-full">
                <Image
                  loader={categoryLoader}
                  // Pass Cloudflare image ID or a full URL — the loader handles both
                  src={c.src}
                  alt={c.alt}
                  fill
                  sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                  className="object-cover"
                  priority={false}
                  draggable={false}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
              </div>

              <div className="p-4">
                <h2 className="text-lg font-semibold">{c.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{c.description}</p>
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 group-hover:underline">
                    Explore {c.title}
                    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
                      <path d="M7.293 14.707a1 1 0 0 1 0-1.414L10.586 10 7.293 6.707a1 1 0 1 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0z" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
