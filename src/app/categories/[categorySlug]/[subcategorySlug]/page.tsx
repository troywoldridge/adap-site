// src/app/categories/[categorySlug]/[subcategorySlug]/page.tsx
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

/** Build a friendly label from a product, removing the category prefix. */
function labelFromProduct(p: ProductRow, categorySlug: string, fallback: string): string {
  const sc = (p.subcategory_slug || "").trim();
  if (sc) return titleCase(sc);

  const base = (p.slug || p.product_slug || p.name || "").toString().toLowerCase().trim();
  if (base) {
    const prefix = `${categorySlug.toLowerCase().trim()}-`;
    const rest = base.startsWith(prefix) ? base.slice(prefix.length) : base;
    const parts = rest.split(/[-\s]+/).filter(Boolean);
    if (parts.length) {
      const take = parts.slice(0, Math.min(3, parts.length)).join(" ");
      return titleCase(take);
    }
  }
  return titleCase(fallback);
}

/** Pick the best human label from a set of products (majority vote), or use fallback. */
function chooseBestLabel(products: ProductRow[], categorySlug: string, fallback: string): string {
  const counts = new Map<string, number>();
  for (const p of products) {
    const sid = toNum(p.subcategory_id);
    const lbl = labelFromProduct(p, categorySlug, sid != null ? `Sub ${sid}` : fallback);
    const k = lbl.trim();
    if (!k) continue;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  if (counts.size === 0) return titleCase(fallback);
  // highest count, then alphabetically
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  return best;
}

/** Mirror the category-page fallback key. */
function productDerivedSubKey(p: ProductRow, categorySlug: string): string {
  if ((p.subcategory_slug || "").trim()) return toSlug(p.subcategory_slug!);
  if (toNum(p.subcategory_id) != null) return `sub-${toNum(p.subcategory_id)}`;
  const base = (p.slug || p.product_slug || "").toLowerCase();
  const prefix = `${categorySlug}-`;
  const rest = base.startsWith(prefix) ? base.slice(prefix.length) : base;
  const parts = rest.split("-").filter(Boolean);
  return parts.slice(0, Math.min(2, parts.length)).join("-") || "general";
}

/* ---------------- SEO ---------------- */
export async function generateMetadata(
  { params }: { params: Promise<{ categorySlug: string; subcategorySlug: string }> }
): Promise<Metadata> {
  const { categorySlug, subcategorySlug } = await params;

  const cats = categoryAssets as Category[];
  const subs = subcategoryAssets as Subcategory[];
  const prods = productAssets as ProductRow[];

  const cat = cats.find((c) => c.slug === categorySlug);
  if (!cat) return { title: "Category Not Found" };

  const ensureSubSlug = (s: Subcategory) =>
    (s.slug && s.slug.trim()) || toSlug(s.name) || (toNum(s.subcategory_id) ?? toNum(s.id))?.toString() || "subcategory";

  const realSub = subs.find(
    (s) =>
      ensureSubSlug(s) === subcategorySlug &&
      ((s.category_slug || "").trim() === cat.slug || (toNum(s.category_id) ?? NaN) === toNum(cat.id))
  );

  // If we don't have a real subcategory name, compute a friendly one from products
  const inCat = prods.filter(
    (p) =>
      (p.category_slug || "").trim() === cat.slug ||
      (toNum(p.category_id) !== null && toNum(p.category_id) === toNum(cat.id))
  );
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

  const fallbackLabel =
    subcategorySlug.startsWith("sub-") ? `Sub ${subcategorySlug.slice(4)}` : subcategorySlug;
  const friendlySub = titleCase(realSub?.name ?? chooseBestLabel(products, categorySlug, fallbackLabel));
  const readableCat = titleCase(cat.name ?? categorySlug);

  const desc =
    realSub?.description ||
    `Explore ${friendlySub} in ${readableCat}. Live pricing via the SinaLite API; images via the Cloudflare CDN.`;

  return {
    title: `${friendlySub} • ${readableCat} | American Design And Printing`,
    description: desc,
    alternates: { canonical: `/categories/${categorySlug}/${subcategorySlug}` },
    robots: { index: true, follow: true, googleBot: { "max-snippet": -1, "max-image-preview": "large", "max-video-preview": -1 } },
    openGraph: {
      type: "website",
      title: `${friendlySub} • ${readableCat}`,
      description: desc,
      url: `${SITE}/categories/${categorySlug}/${subcategorySlug}`,
    },
    twitter: { card: "summary_large_image", title: `${friendlySub} • ${readableCat}`, description: desc },
  };
}

/* ---------------- PAGE ---------------- */
export default async function SubcategoryPage(
  { params }: { params: Promise<{ categorySlug: string; subcategorySlug: string }> }
) {
  const { categorySlug, subcategorySlug } = await params;

  const cats = categoryAssets as Category[];
  const subs = subcategoryAssets as Subcategory[];
  const prods = productAssets as ProductRow[];

  const cat = cats.find((c) => c.slug === categorySlug);
  if (!cat) return notFound();
  const catId = toNum(cat.id);

  const ensureSubSlug = (s: Subcategory) =>
    (s.slug && s.slug.trim()) || toSlug(s.name) || (toNum(s.subcategory_id) ?? toNum(s.id))?.toString() || "subcategory";

  const realSub = subs.find(
    (s) =>
      ensureSubSlug(s) === subcategorySlug &&
      ((s.category_slug || "").trim() === cat.slug || (toNum(s.category_id) ?? NaN) === toNum(cat.id))
  );

  const inCat = prods.filter(
    (p) =>
      (p.category_slug || "").trim() === cat.slug ||
      (toNum(p.category_id) !== null && toNum(p.category_id) === catId)
  );

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

  // ✅ Friendly label for header + badges
  const fallbackLabel =
    subcategorySlug.startsWith("sub-") ? `Sub ${subcategorySlug.slice(4)}` : subcategorySlug;
  const friendlySub = titleCase(realSub?.name ?? chooseBestLabel(products, categorySlug, fallbackLabel));
  const readableCat = titleCase(cat.name ?? categorySlug);

  // Optional “From $” via SinaLite (per SinaLite API documentation)
  const priceSnapshots: Record<string, string | undefined> = {};
  await Promise.all(
    products.slice(0, 60).map(async (p) => {
      const idStr = p.sinalite_id != null ? String(p.sinalite_id) : p.id != null ? String(p.id) : null;
      const idNum = idStr ? Number(idStr) : NaN;
      if (!Number.isFinite(idNum) || idNum <= 0) return;
      try {
        const snap = await getDefaultPriceSnapshot(idNum);
        if (snap && typeof (snap as any).price === "number") {
          priceSnapshots[(p.slug || p.product_slug || p.name || String(p.id) || "").toString()] =
            new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: (snap as any).currency || "USD",
            }).format((snap as any).price);
        }
      } catch {
        /* ignore */
      }
    })
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm text-gray-600" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link className="hover:underline" href="/">Home</Link></li>
          <li>/</li>
          <li><Link className="hover:underline" href={`/categories/${categorySlug}`}>{readableCat}</Link></li>
          <li>/</li>
          <li aria-current="page" className="text-gray-900 font-medium">{friendlySub}</li>
        </ol>
      </nav>

      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold">{friendlySub}</h1>
        {realSub?.description ? (
          <p className="mt-2 max-w-3xl text-gray-600">{realSub.description}</p>
        ) : (
          <p className="mt-2 max-w-3xl text-gray-600">
            Configure options and see live pricing (per SinaLite API docs). Images are served via the Cloudflare CDN. 🚀
          </p>
        )}
      </header>

      {products.length === 0 ? (
        <div className="rounded-lg border p-6 text-gray-600">No products found in this subcategory yet.</div>
      ) : (
        <ul
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 list-none"
          aria-label={`${friendlySub} products`}
        >
          {products.map((p) => {
            const slug =
              (p.slug || p.product_slug || p.name || String(p.id) || "").toString().trim();
            const href = `/categories/${categorySlug}/${subcategorySlug}/${slug}`;
            const price = priceSnapshots[slug];
            const displayName = (p.name && p.name.trim())
              ? p.name
              : titleCase((p.sku || slug).toString().replace(/[_-]+/g, " "));

            return (
              <li key={slug || String(p.id) || String(p.sku)}>
                <Link
                  href={href}
                  className="group relative rounded-2xl border bg-white shadow-sm overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <div className="relative w-full aspect-[4/3] bg-gray-50">
                    {p.cf_image_1_id ? (
                      /* 🔧 FIX: pass the correct props for SubcategoryTileImage */
                      <SubcategoryTileImage idOrUrl={p.cf_image_1_id} alt={displayName} />
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

                      {/* ✅ Badge uses friendly subcategory label, not "Sub 30" */}
                      <span className="inline-flex items-center rounded-md border px-2 py-1 text-xs text-gray-700 bg-gray-50">
                        {friendlySub}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-gray-600">
                      {price ? <>From <strong>{price}</strong></> : <>Live pricing</>}
                    </div>
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
