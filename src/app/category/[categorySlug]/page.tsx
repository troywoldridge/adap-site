// src/app/category/[categorySlug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";

import categoryAssets from "@/data/categoryAssets.json";
import subcategoryAssets from "@/data/subcategoryAssets.json";
import productAssets from "@/data/productAssets.json";

import SubcategoryTileImage from "@/components/Categories/SubcategoryTileImage";

/* ─────────────────────────────────────────────────────────────
   Types (loose/tolerant to your JSON columns)
────────────────────────────────────────────────────────────── */
type CategoryAsset = {
  slug: string;
  id?: number | string;
  category_id?: number | string;
  ["Id (category)"]?: number | string;
  name?: string;
  description?: string | null;
  cf_image_id?: string | null;
  sort_order?: number | string | null;
  [k: string]: unknown;
};

type SubAsset = {
  id?: number | string;
  subcategory_id?: number | string;
  category_id?: number | string;
  category_slug?: string;
  slug?: string; // ← make optional; we’ll ensure it below
  name: string;
  description?: string | null;
  cf_image_id?: string | null;
  sort_order?: number | string | null;
  [k: string]: unknown;
};

type ProductAsset = {
  id?: number | string;
  category_id?: number | string;
  subcategory_id?: number | string;
  sinalite_id?: number | string;
  sku?: string;
  name?: string;
  slug?: string;
  cf_image_1_id?: string | null;
  cf_image_2_id?: string | null;
  cf_image_3_id?: string | null;
  cf_image_4_id?: string | null;
  [k: string]: unknown;
};

/* ─────────────────────────────────────────────────────────────
   Helpers
────────────────────────────────────────────────────────────── */
function titleCaseFromSlug(slug: string) {
  return slug.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function toNum(n: unknown): number | null {
  if (n === null || n === undefined) return null;
  const s = String(n).trim();
  if (s === "") return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

// prefer `id`, else `subcategory_id`
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

function collectProductImageIds(p: ProductAsset): string[] {
  const out: string[] = [];
  const keys = ["cf_image_1_id", "cf_image_2_id", "cf_image_3_id", "cf_image_4_id"] as const;
  for (const k of keys) {
    const v = (p as any)[k];
    if (typeof v === "string" && v.trim()) out.push(v.trim());
  }
  return out;
}

// simple slugify (no extra deps here)
function toSlug(s?: string) {
  const v = (s ?? "").toLowerCase().trim();
  if (!v) return "";
  return v.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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

function resolveSubImage(
  sub: SubAsset,
  products: ProductAsset[]
): { src: string; kind: "id" | "url"; alt: string } {
  if (sub.cf_image_id && typeof sub.cf_image_id === "string") {
    return { src: sub.cf_image_id, kind: "id", alt: sub.name };
  }
  const subId = pickSubId(sub);
  if (subId !== null) {
    const p = products.find((pr) => toNum(pr.subcategory_id) === subId);
    if (p) {
      const imgs = collectProductImageIds(p);
      if (imgs.length) return { src: imgs[0], kind: "id", alt: sub.name };
    }
  }
  return { src: "/placeholder.png", kind: "url", alt: sub.name };
}

function bySortOrderAsc<T extends { sort_order?: number | string | null; name?: string }>(a: T, b: T) {
  const sa = toNum(a.sort_order);
  const sb = toNum(b.sort_order);
  if (sa !== null && sb !== null && sa !== sb) return sa - sb;
  const an = (a.name ?? "").toString();
  const bn = (b.name ?? "").toString();
  return an.localeCompare(bn);
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

  const categories = categoryAssets as unknown as CategoryAsset[];
  const subsAllRaw = subcategoryAssets as unknown as SubAsset[];
  const products = productAssets as unknown as ProductAsset[];

  // 0) normalize sub slugs up-front (prevents `/undefined`)
  const subsAll = subsAllRaw
    .map((s) => {
      const slug = ensureSubSlug(s);
      if (!slug) return null;
      return { ...s, slug };
    })
    .filter(Boolean) as SubAsset[];

  // 1) category by slug
  const cat = categories.find((c) => (c.slug ?? "").toString() === categorySlug);
  if (!cat) return notFound();

  // 2) numeric ids for this category
  const catIds = getCategoryNumericIds(cat);
  const hasCatIds = catIds.length > 0;

  // 3) derive subcategory_ids from products for THIS category (SinaLite-aligned join)
  const productMatchesForCategory = hasCatIds
    ? products.filter((p) => {
        const pcid = toNum(p.category_id);
        return pcid !== null && catIds.includes(pcid);
      })
    : [];

  const subIdsFromProducts = new Set<number>();
  for (const p of productMatchesForCategory) {
    const sid = toNum(p.subcategory_id);
    if (sid !== null) subIdsFromProducts.add(sid);
  }

  // 4) collect subs by those ids, OR fall back to direct slug/ID link
  let subs: SubAsset[] = [];
  if (subIdsFromProducts.size > 0) {
    subs = subsAll.filter((s) => {
      const sid = pickSubId(s);
      return sid !== null && subIdsFromProducts.has(sid);
    });
  } else {
    subs = subsAll.filter((s) => {
      const bySlug = (s.category_slug ?? "").toString() === categorySlug;
      if (bySlug) return true;
      if (!hasCatIds) return false;
      const scid = toNum(s.category_id);
      return scid !== null && catIds.includes(scid);
    });
  }

  // 5) de-dupe before render — prefer `id/subcategory_id`, else slug
  const seen = new Set<string>();
  const uniqueSubs: SubAsset[] = [];
  for (const s of subs) {
    const sid = pickSubId(s);
    const key = sid !== null ? `id:${sid}` : `slug:${s.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueSubs.push(s);
  }

  // 6) sort nicely
  uniqueSubs.sort(bySortOrderAsc);

  const title = titleCaseFromSlug(categorySlug);

  return (
    <main className="container" style={{ padding: 24 }}>
      <header className="category-intro" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 className="section-title" style={{ marginBottom: 8 }}>{title}</h1>
        {cat.description ? (
          <p className="category-intro__desc" style={{ color: "#555", marginBottom: 24 }}>
            {cat.description}
          </p>
        ) : null}
      </header>

      {uniqueSubs.length === 0 ? (
        <p className="category-intro__desc">No subcategories found for this category.</p>
      ) : (
        <ul
          className="category-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
            padding: 0,
            listStyle: "none",
            maxWidth: 1100,
            margin: "0 auto",
            justifyItems: "center",
          }}
        >
          {uniqueSubs.map((s) => {
            const resolved = resolveSubImage(s, products);
            const sid = pickSubId(s);
            const key = sid !== null ? `sub-${sid}` : `slug-${s.slug}`;
            return (
              <li
                key={key}
                className="category-card"
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#fff",
                  padding: 16,
                  width: "100%",
                  maxWidth: 360,
                  textAlign: "center",
                  transition: "transform 160ms ease, box-shadow 160ms ease",
                }}
              >
                <Link
                  href={`/category/${categorySlug}/${s.slug}`} // ✅ slug guaranteed
                  title={s.name}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  <div
                    className="category-card__image-wrap"
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "4 / 3",
                      overflow: "hidden",
                      borderRadius: 8,
                      background: "#f5f5f5",
                      marginBottom: 12,
                    }}
                  >
                    <SubcategoryTileImage
                      src={resolved.src}
                      kind={resolved.kind}
                      alt={resolved.alt}
                    />
                  </div>

                  <h3 style={{ margin: "0 0 6px", textTransform: "capitalize" }}>
                    {s.name.replace(/[_-]+/g, " ")}
                  </h3>

                  {s.description ? (
                    <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
                      {s.description}
                    </p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
