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


function tryLabelFromAssets(
  subs: Subcategory[],
  product: ProductRow
): string | null {
  const sid = toNum(product.subcategory_id);
  if (sid == null) return null;

  // Try id match OR subcategory_id match (your JSON sometimes uses one or the other)
  const hit =
    subs.find((s) => toNum(s.id) === sid) ||
    subs.find((s) => toNum(s.subcategory_id) === sid);

  if (!hit?.name) return null;
  return titleCase(hit.name.replace(/[_-]+/g, " "));
}

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

function displayNameFromProduct(p: ProductRow): string {
  const nm = (p.name ?? "").trim();
  if (nm) return nm;
  const sku = (p.sku ?? "").trim().replace(/[_-]+/g, " ");
  if (sku) return titleCase(sku);
  const sl = (p.slug ?? p.product_slug ?? "").trim().replace(/[_-]+/g, " ");
  if (sl) return titleCase(sl);
  return "Product";
}

function typeLabelForCard(
  realSub: Subcategory | null,
  categorySlug: string,
  product: ProductRow,
  derivedSubSlugFromRoute: string,
  subs: Subcategory[]
): string {
  // 1) Real subcategory wins
  if (realSub?.name) return titleCase(realSub.name);

  // 2) Try to resolve via subcategoryAssets using product.subcategory_id
  const byAssets = tryLabelFromAssets(subs, product);
  if (byAssets) return byAssets;

  // 3) Try explicit product subcategory fields
  const scSlug = (product.subcategory_slug ?? "").trim();
  if (scSlug) return titleCase(scSlug.replace(/[_-]+/g, " "));

  // 4) Fall back to the derived key from routing
  return titleCase(derivedSubSlugFromRoute.replace(/[_-]+/g, " "));
}

/** must mirror the key logic from category page */
function productDerivedSubKey(p: ProductRow, categorySlug: string): string {
  if (p.subcategory_slug && p.subcategory_slug.trim()) return toSlug(p.subcategory_slug);
  if (toNum(p.subcategory_id) != null) return `sub-${toNum(p.subcategory_id)}`;
  const base = (p.slug || p.product_slug || "").toLowerCase();
  const prefix = `${categorySlug}-`;
  let rest = base.startsWith(prefix) ? base.slice(prefix.length) : base;
  const parts = rest.split("-").filter(Boolean);
  const key = parts.slice(0, Math.min(2, parts.length)).join("-") || "general";
  return key;
}

/* ---------------- SEO ---------------- */
export async function generateMetadata({ params }: { params: { categorySlug: string; subcategorySlug: string } }): Promise<Metadata> {
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
    (sub?.description) ||
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
}: {
  params: { categorySlug: string; subcategorySlug: string };
}) {
  const { categorySlug, subcategorySlug } = params;

  const cats = categoryAssets as Category[];
  const subs = subcategoryAssets as Subcategory[];
  const prods = productAssets as ProductRow[];

  const cat = cats.find((c) => c.slug === categorySlug);
  if (!cat) return notFound();
  const catId = toNum(cat.id);

  // Real subcategory if present
  const realSub = subs.find(
    (s) =>
      ensureSubSlug(s) === subcategorySlug &&
      ((s.category_slug || "").trim() === cat.slug || (toNum(s.category_id) ?? NaN) === toNum(cat.id))
  );

  // Filter products in category
  const inCat = prods.filter(
    (p) =>
      (p.category_slug || "").trim() === cat.slug ||
      (toNum(p.category_id) !== null && toNum(p.category_id) === catId)
  );

  // If real subcategory: match by subcategory_id/slug; else: derived grouping key (matches category page)
  const products: ProductRow[] = realSub
    ? inCat.filter((p) => {
        const matchId =
          (toNum(p.subcategory_id) != null &&
            (toNum(realSub.subcategory_id) === toNum(p.subcategory_id) ||
             toNum(realSub.id) === toNum(p.subcategory_id)));
        const matchSlug = (p.subcategory_slug || "").trim() === ensureSubSlug(realSub);
        return matchId || matchSlug;
      })
    : inCat.filter((p) => productDerivedSubKey(p, categorySlug) === subcategorySlug);

  // Optional: “From $” via SinaLite API (best-effort)
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

  // ✅ Human-friendly labels for the page render
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
            const typeLabel = typeLabelForCard(realSub ?? null, categorySlug, p, subcategorySlug);

            return (
              <Link
                key={slug || String(p.id) || String(p.sku)}
                href={href}
                className="group relative rounded-2xl border bg-white shadow-sm overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {/* Image tile — SubcategoryTileImage uses Next <Image> + Cloudflare loader */}
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
                  {/* ✅ Always a human name, never an ID */}
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

                    {/* ✅ Small type/badge: “Standard”, “Specialty”, etc. */}
                    <span className="inline-flex items-center rounded-md border px-2 py-1 text-xs text-gray-700 bg-gray-50">
                      {typeLabel}
                    </span>
                  </div>

                  {/* Optional: price hint line */}
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
