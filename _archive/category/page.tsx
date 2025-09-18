// src/app/categories/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import categoryAssets from "@/data/categoryAssets.json";
import { cfImage } from "@/lib/cfImages"; // builds imagedelivery.net/<ACCOUNT>/<ID>/<VARIANT>

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

// 🔴 These tiles get a small badge; your next.config handles the temporary redirects.
const COMING_SOON = new Set(["promotional", "apparel"]);

type CategoryRow = {
  id?: number | string | null;
  slug: string;
  name?: string | null;
  description?: string | null;
  cf_image_id?: string | null;
  sort_order?: number | string | null;
  [k: string]: unknown;
};

function prettyTitle(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://americandesignandprinting.com").replace(/\/+$/, "");
}

export const metadata: Metadata = {
  title: "Shop by Category | American Design And Printing",
  description:
    "Browse our core categories — from print and stationery to labels, apparel, and large format.",
  openGraph: {
    title: "Shop by Category",
    description: "Premium print, packaging, apparel, and promo — explore our top categories.",
    url: "/categories",
    type: "website",
  },
  robots: { index: true, follow: true },
};

function CategoriesJsonLd({ slugs }: { slugs: string[] }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: slugs.map((slug, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteUrl()}/category/${slug}`,
      name: prettyTitle(slug),
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

export default function CategoriesPage() {
  // Treat categoryAssets.json as an ARRAY of rows (new format)
  const rows = categoryAssets as unknown as CategoryRow[];

  // Build a lookup by slug for quick access
  const bySlug = new Map<string, CategoryRow>();
  for (const r of rows) {
    const slug = (r?.slug ?? "").toString().trim();
    if (slug) bySlug.set(slug, r);
  }

  // Build featured items from the fixed slug list
  const items = FEATURED_SLUGS.map((slug) => {
    const raw = bySlug.get(slug);
    if (!raw) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[categories] Missing category for slug: ${slug}`);
      }
      return null;
    }
    const imageId = (raw.cf_image_id ?? "").toString().trim();
    if (!imageId) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[categories] Missing cf_image_id for slug: ${slug}`);
      }
      return null; // skip if no image
    }

    return {
      slug,
      title: (raw.name && String(raw.name).trim()) || prettyTitle(slug),
      description:
        (raw.description && String(raw.description).trim()) ||
        "Explore products in this category — fulfillment & pricing via SinaLite (see API docs).",
      // Build a Cloudflare Images URL using your site variant for category cards
      url: cfImage(imageId, "category"),
      sortOrder:
        typeof raw.sort_order === "number"
          ? raw.sort_order
          : Number.isFinite(Number(raw.sort_order))
          ? Number(raw.sort_order)
          : null,
      comingSoon: COMING_SOON.has(slug as any),
    };
  })
    .filter(Boolean)
    .sort((a: any, b: any) => {
      // Prefer explicit sort_order when present; otherwise keep FEATURED_SLUGS order
      if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder;
      return FEATURED_SLUGS.indexOf(a.slug) - FEATURED_SLUGS.indexOf(b.slug);
    }) as Array<{ slug: string; title: string; description: string; url: string; comingSoon: boolean }>;

  return (
    <main className="container mx-auto max-w-7xl px-4 py-10">
      <CategoriesJsonLd slugs={items.map((i) => i.slug)} />

      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Shop by Category</h1>
        <p className="mt-2 text-slate-600">
          Images ship via <strong>Cloudflare CDN</strong>; pricing &amp; fulfillment use{" "}
          <strong>SinaLite</strong> (see their API docs).
        </p>
      </header>

      {items.length === 0 ? (
        <p className="text-slate-600">No categories available.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <li key={c.slug} className="group">
              <Link
                href={`/category/${c.slug}`} // next.config handles temp redirects
                aria-label={`Explore ${c.title}`}
                className={[
                  // base card
                  "block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm",
                  // hover/focus lift
                  "transition-[transform,box-shadow] duration-200 ease-out will-change-transform transform-gpu",
                  "hover:-translate-y-1 hover:shadow-md hover:shadow-black/5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40",
                ].join(" ")}
              >
                <div className="relative aspect-[3/2] w-full overflow-hidden">
                  {/* Badge */}
                  {c.comingSoon && (
                    <div className="absolute right-2 top-2 z-10 rounded bg-amber-600/90 px-2 py-1 text-xs font-semibold text-white shadow">
                      Coming Soon
                    </div>
                  )}

                  {/* subtle image zoom on hover (respects reduced motion) */}
                  <Image
                    src={c.url} // ✅ Cloudflare Images URL
                    alt={c.title}
                    fill
                    sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                    className="object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
                    draggable={false}
                    priority={false}
                    unoptimized // let Cloudflare do its magic
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
      )}
    </main>
  );
}
