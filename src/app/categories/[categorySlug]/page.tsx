// src/app/category/[categorySlug]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

import categoryAssets from "@/data/categoryAssets.json";
import subcategoryAssets from "@/data/subcategoryAssets.json";
import productAssets from "@/data/productAssets.json";

import SubcategoryTileImage from "@/components/Categories/SubcategoryTileImage";
import { cfImage, type Variant as CfVariant } from "@/lib/cfImages";

/* ─────────────────────────────────────────────────────────────
   Types (tolerant to your JSON columns)
────────────────────────────────────────────────────────────── */
type CategoryAsset = {
  id?: number | string | null;
  slug: string;
  name?: string;
  description?: string | null;
  cf_image_id?: string | null;
  sort_order?: number | string | null;
  ["Id (category)"]?: number | string | null;
  category_id?: number | string | null;
  [k: string]: unknown;
};

type SubAsset = {
  id?: number | string | null;
  subcategory_id?: number | string | null;
  category_id?: number | string | null;
  category_slug?: string | null;
  slug?: string | null;
  name: string;
  description?: string | null;
  cf_image_id?: string | null;
  sort_order?: number | string | null;
  [k: string]: unknown;
};

type ProductAsset = {
  id?: number | string | null;
  category_id?: number | string | null;
  subcategory_id?: number | string | null;
  sinalite_id?: number | string | null;
  sku?: string | null;
  name?: string | null;
  slug?: string | null;
  product_slug?: string | null;
  cf_image_1_id?: string | null;
  cf_image_2_id?: string | null;
  cf_image_3_id?: string | null;
  cf_image_4_id?: string | null;
  [k: string]: unknown;
};

/* ─────────────────────────────────────────────────────────────
   Helpers
────────────────────────────────────────────────────────────── */
const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://adapnow.com";

// variant caster for cfImage
const V = (v: string) => v as unknown as CfVariant;

function toNum(n: unknown): number | null {
  if (n == null) return null;
  const v = Number(String(n).trim());
  return Number.isFinite(v) ? v : null;
}
function toSlug(s?: string | null) {
  const v = (s ?? "").toLowerCase().trim();
  if (!v) return "";
  return v.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function titleCaseFromSlug(slug: string) {
  return slug.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
function pickSubId(s: SubAsset): number | null {
  return toNum(s.id ?? s.subcategory_id);
}
function getCategoryNumericIds(cat: CategoryAsset): number[] {
  const candidates = [cat.id, cat.category_id, (cat as any)["Id (category)"]];
  const out = new Set<number>();
  for (const c of candidates) {
    const n = toNum(c);
    if (n !== null) out.add(n);
  }
  return [...out];
}
function bySortOrderAsc<T extends { sort_order?: number | string | null; name?: string }>(a: T, b: T) {
  const sa = toNum(a.sort_order);
  const sb = toNum(b.sort_order);
  if (sa !== null && sb !== null && sa !== sb) return sa - sb;
  return (a.name ?? "").localeCompare(b.name ?? "");
}
function ensureSubSlug(s: SubAsset): string | null {
  const byField = (s.slug ?? "").toString().trim();
  if (byField) return byField;
  const byName = toSlug(s.name);
  if (byName) return byName;
  const id = pickSubId(s);
  if (id !== null) return `sub-${id}`;
  return null;
}
function collectProductImageIds(p: ProductAsset): string[] {
  const keys = ["cf_image_1_id", "cf_image_2_id", "cf_image_3_id", "cf_image_4_id"] as const;
  const out: string[] = [];
  for (const k of keys) {
    const v = (p as any)[k];
    if (typeof v === "string" && v.trim()) out.push(v.trim());
  }
  return out;
}
function resolveSubImage(sub: SubAsset, products: ProductAsset[]): { src: string; kind: "id" | "url"; alt: string } {
  if (sub.cf_image_id && typeof sub.cf_image_id === "string" && sub.cf_image_id.trim()) {
    return { src: sub.cf_image_id.trim(), kind: "id", alt: sub.name };
  }
  const sid = pickSubId(sub);
  if (sid !== null) {
    const p = products.find((pr) => toNum(pr.subcategory_id) === sid);
    if (p) {
      const imgs = collectProductImageIds(p);
      if (imgs.length) return { src: imgs[0], kind: "id", alt: sub.name };
    }
  }
  return { src: "/placeholder.png", kind: "url", alt: sub.name };
}

/* ─────────────────────────────────────────────────────────────
   SEO
────────────────────────────────────────────────────────────── */
export async function generateMetadata({
  params,
}: {
  params: { categorySlug: string };
}): Promise<Metadata> {
  const cat = (categoryAssets as CategoryAsset[]).find((c) => c.slug === params.categorySlug);
  if (!cat) return { title: "Category Not Found" };

  const title = `${cat.name || titleCaseFromSlug(cat.slug)} | American Design And Printing`;
  const desc =
    cat.description ||
    `Explore ${cat.name || titleCaseFromSlug(cat.slug)} — trade pricing, fast turnaround, Cloudflare CDN images.`;

  return {
    title,
    description: desc,
    alternates: { canonical: `/category/${cat.slug}` },
    openGraph: {
      title,
      description: desc,
      url: `${SITE}/category/${cat.slug}`,
      images: cat.cf_image_id
        ? [{ url: cfImage(cat.cf_image_id, V("categoryHero")), width: 1200, height: 630 }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: cat.cf_image_id ? [cfImage(cat.cf_image_id, V("categoryHero"))] : undefined,
    },
  };
}

/* ─────────────────────────────────────────────────────────────
   Page
────────────────────────────────────────────────────────────── */
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;

  const categories = categoryAssets as CategoryAsset[];
  const subsAllRaw = subcategoryAssets as unknown as SubAsset[];
  const products = productAssets as ProductAsset[];

  // category by slug
  const cat = categories.find((c) => (c.slug ?? "").toString() === categorySlug);
  if (!cat) return notFound();

  // collect usable sub slugs + scope to this category (by slug or id)
  const catIds = getCategoryNumericIds(cat);
  const hasCatIds = catIds.length > 0;

  const subsAll = subsAllRaw
    .map((s) => {
      const slug = ensureSubSlug(s);
      if (!slug) return null;
      return { ...s, slug };
    })
    .filter(Boolean) as SubAsset[];

  const subsScoped = subsAll.filter((s) => {
    const bySlug = (s.category_slug || "").trim() === cat.slug;
    if (bySlug) return true;
    if (!hasCatIds) return false;
    const scid = toNum(s.category_id);
    return scid !== null && catIds.includes(scid);
  });

  // sort + de-dupe
  subsScoped.sort(bySortOrderAsc);
  const seen = new Set<string>();
  const subs: SubAsset[] = [];
  for (const s of subsScoped) {
    const sid = pickSubId(s);
    const key = sid !== null ? `id:${sid}` : `slug:${s.slug}`;
    if (!seen.has(key)) {
      seen.add(key);
      subs.push(s);
    }
  }

  // JSON-LD
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Products", item: `${SITE}/products` },
      { "@type": "ListItem", position: 3, name: cat.name || titleCaseFromSlug(cat.slug), item: `${SITE}/category/${cat.slug}` },
    ],
  };
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: subs.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.name,
      url: `${SITE}/category/${categorySlug}/${s.slug}`,
      image: s.cf_image_id ? cfImage(s.cf_image_id, V("subcategoryTile")) : undefined,
    })),
  };

  const heroUrl = cat.cf_image_id ? cfImage(cat.cf_image_id, V("categoryHero")) : undefined;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />

      <header className="mb-8">
        <nav className="text-sm text-gray-500 mb-3" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1">
            <li><Link className="hover:underline" href="/">Home</Link></li>
            <li>/</li>
            <li><Link className="hover:underline" href="/products">Products</Link></li>
            <li>/</li>
            <li aria-current="page" className="text-gray-900 font-medium">
              {cat.name || titleCaseFromSlug(cat.slug)}
            </li>
          </ol>
        </nav>

        <h1 className="text-2xl md:text-3xl font-semibold">
          {cat.name || titleCaseFromSlug(cat.slug)}
        </h1>
        {cat.description ? <p className="mt-2 max-w-2xl text-gray-600">{cat.description}</p> : null}

        {heroUrl ? (
          <div className="mt-6 rounded-xl overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroUrl} alt={cat.name || titleCaseFromSlug(cat.slug)} className="w-full h-[220px] object-cover" loading="lazy" />
          </div>
        ) : null}
      </header>

      {subs.length === 0 ? (
        <p className="text-gray-600">No subcategories found for this category.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subs.map((s) => {
            const resolved = resolveSubImage(s, products);
            return (
              <li key={(pickSubId(s) ?? `slug:${s.slug}`).toString()}>
                <Link
                  href={`/category/${categorySlug}/${s.slug}`}
                  className="block rounded-xl overflow-hidden bg-white border shadow-sm hover:shadow-md transition"
                >
                  <div className="w-full aspect-[4/3]">
                    <SubcategoryTileImage src={resolved.src} kind={resolved.kind} alt={resolved.alt} />
                  </div>
                  <div className="p-4">
                    <div className="font-medium text-gray-900">{s.name.replace(/[_-]+/g, " ")}</div>
                    {s.description ? <p className="text-sm text-gray-600 mt-1">{s.description}</p> : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

/* Build statically from local JSON */
export function generateStaticParams() {
  return (categoryAssets as { slug: string }[]).map((c) => ({ categorySlug: c.slug }));
}
