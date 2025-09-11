import "server-only";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import categoryAssets from "@/data/categoryAssets.json";
import subcategoryAssets from "@/data/subcategoryAssets.json";
import productAssets from "@/data/productAssets.json";

import SubcategoryTileImage from "@/components/SubcategoryTileImage";
import { getDefaultPriceSnapshot } from "@/lib/sinalite.client";

/* ---------------- Types ---------------- */
type Category = { id?: number | string | null; slug: string; name?: string | null; description?: string | null };
type Subcategory = {
  id?: number | string | null;
  subcategory_id?: number | string | null;
  category_id?: number | string | null;
  category_slug?: string | null;
  slug?: string | null;
  name: string;
  description?: string | null;
  cf_image_id?: string | null;
  sort_order?: number | string | null;
};
type ProductRow = {
  id?: number | string | null;
  sinalite_id?: number | string | null;
  category_id?: number | string | null;
  category_slug?: string | null;
  subcategory_id?: number | string | null;
  subcategory_slug?: string | null;
  sku?: string | null;
  name?: string | null;
  slug?: string | null;
  product_slug?: string | null;
  cf_image_1_id?: string | null;
  cf_image_2_id?: string | null;
  cf_image_3_id?: string | null;
  cf_image_4_id?: string | null;
  sort_order?: number | string | null;
  [k: string]: any;
};

/* ---------------- Utils ---------------- */
const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://adapnow.com";

const toNum = (n: unknown): number | null => {
  const s = n == null ? "" : String(n).trim();
  if (!s) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
};
const toSlug = (s?: string | null) =>
  (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const titleCase = (s?: string | null) =>
  (s || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());

function ensureSubSlug(s: Subcategory): string {
  return (s.slug && s.slug.trim())
    || toSlug(s.name)
    || (toNum(s.subcategory_id) ?? toNum(s.id))?.toString()
    || "subcategory";
}

function productSlugFromRow(p: ProductRow): string {
  const cands = [p.slug, p.product_slug, p.name ? toSlug(p.name) : "", p.sku ? toSlug(p.sku) : ""]
    .map((x) => (x ?? "").toString().trim());
  return cands.find(Boolean) || "";
}

/** Human display name for the card title (never an ID). */
function displayNameFromProduct(p: ProductRow): string {
  const nm = (p.name ?? "").trim();
  if (nm) return nm;
  const sku = (p.sku ?? "").trim().replace(/[_-]+/g, " ");
  if (sku) return titleCase(sku);
  const sl = (p.slug ?? p.product_slug ?? "").trim().replace(/[_-]+/g, " ");
  if (sl) return titleCase(sl);
  return "Product";
}

/** Normalize the small badge text (Standard, Specialty, etc.) */
function normalizeBadgeLabel(label: string, categorySlug: string): string {
  let s = (label || "").trim();
  if (!s) return "Standard";

  // Strip category name prefix like "Business Cards - Standard"
  const catName = titleCase(categorySlug.replace(/[_-]+/g, " "));
  s = s.replace(new RegExp(`^${catName}\\s*[-–—:]\\s*`, "i"), "");

  const map: Record<string, string> = {
    std: "Standard",
    standard: "Standard",
    specialty: "Specialty",
    specialties: "Specialty",
    premium: "Premium",
    classic: "Standard",
    general: "Standard",
  };
  const key = s.toLowerCase();
  if (map[key]) return map[key];

  s = s.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return titleCase(s);
}

function tryLabelFromAssets(subs: Subcategory[], product: ProductRow): string | null {
  const sid = toNum(product.subcategory_id);
  if (sid == null) return null;
  const hit =
    subs.find((s) => toNum(s.id) === sid) ||
    subs.find((s) => toNum(s.subcategory_id) === sid);
  if (!hit?.name) return null;
  return titleCase(hit.name.replace(/[_-]+/g, " "));
}

/** Fallback grouping key used on category page; we mirror it here. */
function productDerivedSubKey(p: ProductRow, categorySlug: string): string {
  if (p.subcategory_slug && p.subcategory_slug.trim()) return toSlug(p.subcategory_slug);
  if (toNum(p.subcategory_id) != null) return `sub-${toNum(p.subcategory_id)}`;
  const base = (p.slug || p.product_slug || "").toLowerCase();
  const prefix = `${categorySlug}-`;
  const rest = base.startsWith(prefix) ? base.slice(prefix.length) : base;
  const parts = rest.split("-").filter(Boolean);
  return parts.slice(0, Math.min(2, parts.length)).join("-") || "general";
}

/** Decide the badge label for a product card */
function typeLabelForCard(
  realSub: Subcategory | null,
  categorySlug: string,
  product: ProductRow,
  derivedSubSlugFromRoute: string,
  subs: Subcategory[]
): string {
  if (realSub?.name) return normalizeBadgeLabel(titleCase(realSub.name), categorySlug);

  const byAssets = tryLabelFromAssets(subs, product);
  if (byAssets) return normalizeBadgeLabel(byAssets, categorySlug);

  const scSlug = (product.subcategory_slug ?? "").trim();
  if (scSlug) return normalizeBadgeLabel(titleCase(scSlug.replace(/[_-]+/g, " ")), categorySlug);

  return normalizeBadgeLabel(titleCase(derivedSubSlugFromRoute.replace(/[_-]+/g, " ")), categorySlug);
}

/* ---------------- SEO ---------------- */
export async function generateMetadata({
  params,
}: { params: { categorySlug: string; subcategorySlug: string } }): Promise<Metadata> {
  const { categorySlug, subcategorySlug } = params;

  const cats = categoryAssets as Category[];
  const subs = subcategoryAssets as Subcategory[];

  const cat = cats.find((c) => c.slug === categorySlug);
  if (!cat) return { title: "Category Not Found" };

  const sub = subs.find(
    (s) =>
      ensureSubSlug(s) === subcategorySlug &&
      ((s.category_slug || "").trim() === cat.slug || (toNum(s.category_id) ?? NaN) === toNum(cat.id))
  );

  const readableCat = titleCase(cat.name ?? categorySlug);
  const readableSub = titleCase(sub?.name ?? subcategorySlug);

  const desc =
    sub?.description ||
    `Explore ${readableSub} in ${readableCat}. Live pricing via SinaLite API; images via Cloudflare CDN.`;

  return {
    title: `${readableSub} • ${readableCat} | American Design And Printing`,
    description: desc,
    alternates: { canonical: `/categories/${categorySlug}/${subcategorySlug}` },
    robots: {
      index: true,
      follow: true,
      googleBot: { "max-snippet": -1, "max-image-preview": "large", "max-video-preview": -1 },
    },
    openGraph: {
      type: "website",
      title: `${readableSub} • ${readableCat}`,
      description: desc,
      url: `${SITE}/categories/${categorySlug}/${subcategorySlug}`,
    },
    twitter: { card: "summary_large_image", title: `${readableSub} • ${readableCat}`, description: desc },
  };
}

/* ---------------- PAGE ---------------- */
export default async function SubcategoryPage({
  params,
}: { params: { categorySlug: string; subcategorySlug: string } }) {
  const { categorySlug, subcategorySlug } = params;

  const cats = categoryAssets as Category[];
  const subs = subcategoryAssets as Subcategory[];
  const prods = productAssets as ProductRow[];

  const cat = cats.find((c) => c.slug === categorySlug);
  if (!cat) return notFound();
  const catId = toNum(cat.id);

  // Resolve real subcategory (if it exists)
  const realSub = subs.find(
    (s) =>
      ensureSubSlug(s) === subcategorySlug &&
      ((s.category_slug || "").trim() === cat.slug || (toNum(s.category_id) ?? NaN) === toNum(cat.id))
  );

  // Products in this category
  const inCat = prods.filter(
    (p) =>
      (p.category_slug || "").trim() === cat.slug ||
      (toNum(p.category_id) !== null && toNum(p.category_id) === catId)
  );

  // If real subcategory: filter by subcategory id/slug; else: by derived key
  const products: ProductRow[] = realSub
    ? inCat.filter((p) => {
        const matchId =
          toNum(p.subcategory_id) != null &&
          (toNum(realSub.subcategory_id) === toNum(p.subcategory_id) ||
           toNum(realSub.id) === toNum(p.subcategory_id));
        const matchSlug = (p.subcategory_slug || "").trim() === ensureSubSlug(realSub);
        return matchId || matchSlug;
      })
    : inCat.filter((p) => productDerivedSubKey(p, categorySlug) === subcategorySlug);

  // Optional “From $” via SinaLite
  const priceSnapshots: Record<string, string | undefined> = {};
  await Promise.all(
    products.slice(0, 60).map(async (p) => {
      const idStr = p.sinalite_id != null ? String(p.sinalite_id) : p.id != null ? String(p.id) : null;
      const idNum = idStr ? Number(idStr) : NaN;
      if (!Number.isFinite(idNum) || idNum <= 0) return;
      try {
        const snap = await getDefaultPriceSnapshot(idNum);
        if (snap && typeof (snap as any).price === "number") {
          priceSnapshots[productSlugFromRow(p)] = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: (snap as any).currency || "USD",
          }).format((snap as any).price);
        }
      } catch {}
    })
  );

  const readableCat = titleCase(cat.name ?? categorySlug);
  const readableSub = titleCase(realSub?.name ?? subcategorySlug);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm text-gray-600" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link className="hover:underline" href="/">Home</Link></li>
          <li>/</li>
          <li><Link className="hover:underline" href={`/categories/${categorySlug}`}>{readableCat}</Link></li>
          <li>/</li>
          <li aria-current="page" className="text-gray-900 font-medium">{readableSub}</li>
        </ol>
      </nav>

      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold">{readableSub}</h1>
        {realSub?.description ? (
          <p className="mt-2 max-w-3xl text-gray-600">{realSub.description}</p>
        ) : (
          <p className="mt-2 max-w-3xl text-gray-600">
            Choose a product to configure options and see live pricing (per SinaLite API docs). Images are served via the Cloudflare CDN. 🚀
          </p>
        )}
      </header>

      {products.length === 0 ? (
        <div className="rounded-lg border p-6 text-gray-600">No products found in this subcategory yet.</div>
      ) : (
        <section
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          aria-label={`${readableSub} products`}
        >
          {products.map((p) => {
            const slug = productSlugFromRow(p);
            const href = `/categories/${categorySlug}/${subcategorySlug}/${slug}`;
            const price = priceSnapshots[slug];
            const displayName = displayNameFromProduct(p);
            const typeLabel = typeLabelForCard(realSub ?? null, categorySlug, p, subcategorySlug, subs);

            return (
              <Link
                key={slug || String(p.id) || String(p.sku)}
                href={href}
                className="group relative rounded-2xl border bg-white shadow-sm overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <div className="relative w-full aspect-[4/3] bg-gray-50">
                  {p.cf_image_1_id ? (
                    <SubcategoryTileImage src={p.cf_image_1_id} kind="id" alt={displayName} />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-gray-400 text-sm">
                      No image
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h2 className="text-base font-semibold leading-6 text-gray-900 line-clamp-2">
                    {displayName}
                  </h2>

                  {p["description"] ? (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{p["description"]}</p>
                  ) : null}

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center font-medium text-blue-700">
                      Configure
                      <svg className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l5 5a1 1 0 01-.027 1.38l-4.999 5a1 1 0 01-1.415-1.414L13.586 10H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </span>

                    <span className="inline-flex items-center rounded-md border px-2 py-1 text-xs text-gray-700 bg-gray-50">
                      {typeLabel}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-gray-600">
                    {price ? <>From <strong>{price}</strong></> : <>Live pricing</>}
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
