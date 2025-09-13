import "server-only";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import categoryAssets from "@/data/categoryAssets.json";
import subcategoryAssets from "@/data/subcategoryAssets.json";
import productAssets from "@/data/productAssets.json";
import { cfImage } from "@/lib/cfImages";

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
  sku?: string | null;
  name?: string | null;
  product_slug?: string | null;
  slug?: string | null;
  category_id?: number | string | null;
  category_slug?: string | null;
  subcategory_id?: number | string | null;
  subcategory_slug?: string | null;
  cf_image_1_id?: string | null;
  [k: string]: any;
};

/* ---------------- Utils ---------------- */
const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://adapnow.com";

const toNum = (n: unknown): number | null => {
  const s = n == null ? "" : String(n).trim();
  if (!s) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
};
const toSlug = (s?: string | null) =>
  (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const titleCase = (s?: string | null) =>
  (s || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Try to make a nice label from a product's slug/name, removing the category prefix. */
function labelFromProduct(
  p: ProductRow,
  categorySlug: string,
  fallback: string
): string {
  // Prefer explicit subcategory slug when present
  const sc = (p.subcategory_slug || "").trim();
  if (sc) return titleCase(sc);

  // Otherwise try product slug/name minus the category prefix
  const base = (p.slug || p.product_slug || p.name || "").toString().toLowerCase().trim();
  if (base) {
    const prefix = `${categorySlug.toLowerCase().trim()}-`;
    const rest = base.startsWith(prefix) ? base.slice(prefix.length) : base;
    const parts = rest.split(/[-\s]+/).filter(Boolean);
    if (parts.length) {
      // Take first 2–3 words for a clean label
      const take = parts.slice(0, Math.min(3, parts.length)).join(" ");
      return titleCase(take);
    }
  }

  // As a last resort, use whatever we were given
  return titleCase(fallback);
}

/** Build a stable key AND a friendly label. */
function productDerivedSubKey(
  p: ProductRow,
  categorySlug: string
): { key: string; label: string } {
  // 1) If subcategory_slug exists, use it for both key/label
  if ((p.subcategory_slug || "").trim()) {
    const key = toSlug(p.subcategory_slug!);
    return { key, label: titleCase(p.subcategory_slug) };
  }

  // 2) If only numeric subcategory_id exists, keep stable key but derive a HUMAN label
  const sid = toNum(p.subcategory_id);
  if (sid != null) {
    const key = `sub-${sid}`;
    const label = labelFromProduct(p, categorySlug, String(sid));
    return { key, label };
  }

  // 3) Fallback: derive from product slug/name after removing category prefix
  const base = (p.slug || p.product_slug || "").toLowerCase();
  const prefix = `${categorySlug}-`;
  const rest = base.startsWith(prefix) ? base.slice(prefix.length) : base;
  const parts = rest.split("-").filter(Boolean);
  const picked = parts.slice(0, Math.min(2, parts.length)).join("-");
  const key = picked || "general";
  const label = titleCase(picked || "General");
  return { key, label };
}

/* ---------------- SEO ---------------- */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}): Promise<Metadata> {
  const { categorySlug } = await params;

  const cats = categoryAssets as Category[];
  const cat = cats.find((c) => c.slug === categorySlug);
  if (!cat) return { title: "Category Not Found" };

  const readableCat = titleCase(cat.name ?? categorySlug);
  const desc =
    cat.description ||
    `Browse ${readableCat} subcategories. Images via Cloudflare CDN; live pricing on product pages.`;

  return {
    title: `${readableCat} | American Design And Printing`,
    description: desc,
    alternates: { canonical: `/categories/${categorySlug}` },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      title: readableCat,
      description: desc,
      url: `${SITE}/categories/${categorySlug}`,
    },
    twitter: { card: "summary_large_image", title: readableCat, description: desc },
  };
}

/* ---------------- PAGE ---------------- */
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;

  const cats = categoryAssets as Category[];
  const subs = subcategoryAssets as Subcategory[];
  const prods = productAssets as ProductRow[];

  const cat = cats.find((c) => c.slug === categorySlug);
  if (!cat) return notFound();
  const catId = toNum(cat.id);

  // A) Use real subcategory assets when present
  let subPool: Subcategory[] = subs
    .filter(
      (s) =>
        (s.category_slug || "").trim() === cat.slug ||
        (toNum(s.category_id) !== null && toNum(s.category_id) === catId)
    )
    .sort((a, b) => {
      const ao = Number(a.sort_order ?? 9999);
      const bo = Number(b.sort_order ?? 9999);
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });

  // B) Fallback: derive subcategories from products with HUMAN labels
  if (subPool.length === 0) {
    const inCat = prods.filter(
      (p) =>
        (p.category_slug || "").trim() === cat.slug ||
        (toNum(p.category_id) !== null && toNum(p.category_id) === catId)
    );

    const groups = new Map<
      string,
      { slug: string; name: string; cf_image_id?: string | null; count: number }
    >();

    for (const p of inCat) {
      const { key, label } = productDerivedSubKey(p, categorySlug);
      const img = (p.cf_image_1_id || "").trim() || undefined;

      const g = groups.get(key);
      if (g) {
        g.count += 1;
        // If we had a numeric placeholder, upgrade it to a better label when we see one
        if (/^\d+$/.test(g.name) && !/^\d+$/.test(label)) g.name = label;
        if (!g.cf_image_id && img) g.cf_image_id = img;
      } else {
        groups.set(key, {
          slug: key,
          name: label, // <- human label, not the id
          cf_image_id: img ?? null,
          count: 1,
        });
      }
    }

    subPool = Array.from(groups.values())
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .map((g) => ({
        id: null,
        subcategory_id: null,
        category_id: cat.id ?? null,
        category_slug: cat.slug,
        slug: g.slug,
        name: g.name, // <- human name here
        description: null,
        cf_image_id: g.cf_image_id ?? null,
        sort_order: null,
      }));
  }

  const readableCat = titleCase(cat.name ?? categorySlug);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: subPool.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.name,
      url: `${SITE}/categories/${categorySlug}/${
        (s.slug && s.slug.trim()) || toSlug(s.name)
      }`,
      image: s.cf_image_id ? cfImage(s.cf_image_id, "subcategoryThumb") : undefined,
    })),
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <nav className="mb-6 text-sm text-gray-600" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link className="hover:underline" href="/">
              Home
            </Link>
          </li>
          <li>/</li>
          <li aria-current="page" className="text-gray-900 font-medium">
            {readableCat}
          </li>
        </ol>
      </nav>

      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold">{readableCat}</h1>
        {cat.description ? (
          <p className="mt-2 max-w-3xl text-gray-600">{cat.description}</p>
        ) : (
          <p className="mt-2 max-w-3xl text-gray-600">
            Choose a subcategory to continue. Images are delivered via the Cloudflare CDN; pricing is live on product
            pages (per SinaLite API docs).
          </p>
        )}
      </header>

      {subPool.length === 0 ? (
        <div className="rounded-lg border p-6 text-gray-600">
          No subcategories found.
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 list-none">
          {subPool.map((s) => {
            const slug =
              (s.slug && s.slug.trim()) || toSlug(s.name) || "subcategory";
            const img = s.cf_image_id ? cfImage(s.cf_image_id, "subcategoryThumb") : "";

            return (
              <li key={slug}>
                <Link
                  href={`/categories/${categorySlug}/${slug}`}
                  className="block rounded-xl overflow-hidden bg-white border shadow-sm hover:shadow-md transition"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {img ? (
                    <img
                      src={img}
                      alt={titleCase(s.name)}
                      className="w-full aspect-[4/3] object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full aspect-[4/3] bg-gray-100" />
                  )}
                  <div className="p-4">
                    <div className="font-medium text-gray-900">
                      {titleCase(s.name)}       {/* ✅ card title is human */}
                    </div>
                    {s.description ? (
                      <p className="text-gray-600 text-sm mt-1">{s.description}</p>
                    ) : null}
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
