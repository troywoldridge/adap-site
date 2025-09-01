// src/app/category/[categorySlug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";

import categoryAssets from "@/data/categoryAssets.json";
import subcategoryAssets from "@/data/subcategoryAssets.json";
import productAssets from "@/data/productAssets.json";
import productImages from "@/data/productImages.json";
import imagesJson from "@/data/images.json";

import SubcategoryTileImage from "@/components/Categories/SubcategoryTileImage";

/* ──────────────────────────────────────────────────────────────────────────
   Types (relaxed to match your JSON)
────────────────────────────────────────────────────────────────────────── */
type CategoryAssetMap = Record<
  string,
  {
    imageId?: string | null;
    imageUrl?: string | null;
    description?: string | null;
    variant?: string | null;
  }
>;

type SubAsset = {
  id: number;
  category_id: string; // category slug (e.g., "labels-and-packaging")
  slug: string;
  name: string;
  description?: string | null;
  cloudflare_image_id?: string | null;
};

type ProductAsset = {
  id?: number;
  name?: string;
  slug?: string;
  cloudflare_id?: string | null;       // productAssets.json uses this
  cloudflare_image_id?: string | null; // some entries may use this
  description?: string | null;
};

type ImagesRow = {
  category_id?: number | string;
  subcategory_id?: number | string;
  name?: string;
  image_name?: string; // filename or URL
  cloudflare_id?: string;
  product_id?: number;
  matched_sku?: string;
};

type ProductImagesMap = Record<
  string, // subcategory slug
  {
    imageId?: string;
    variant?: string;
    imageUrl?: string;
    description?: string;
  }
>;

/* ──────────────────────────────────────────────────────────────────────────
   Helpers
────────────────────────────────────────────────────────────────────────── */
function titleCaseFromSlug(slug: string) {
  return slug
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function simpleKey(t: string) {
  return t.toLowerCase().replace(/[_-]+/g, " ").trim();
}

// Find a product asset likely representing the subcategory and having a CF id
function findProductAssetIdForSub(sub: SubAsset, products: ProductAsset[]): string | null {
  const exact = products.find(
    (p) => p.slug === sub.slug && (p.cloudflare_id || p.cloudflare_image_id)
  );
  if (exact) return exact.cloudflare_id || exact.cloudflare_image_id || null;

  const ss = simpleKey(sub.slug);
  const sn = simpleKey(sub.name);

  const relaxed = products.find((p) => {
    const pid = p.cloudflare_id || p.cloudflare_image_id;
    if (!pid) return false;
    const ps = p.slug ? simpleKey(p.slug) : "";
    const pn = p.name ? simpleKey(p.name) : "";
    return ps === ss || pn === sn || pn.includes(sn) || sn.includes(pn);
  });

  return relaxed ? (relaxed.cloudflare_id || relaxed.cloudflare_image_id || null) : null;
}

/**
 * Resolve best image for a subcategory.
 * Priority:
 *  1) productImages.json[slug].imageId / imageUrl
 *  2) images.json by subcategory_id → cloudflare_id / image_name
 *  3) productAssets.json by slug/name → cloudflare_id/cloudflare_image_id
 *  4) subcategoryAssets.json.cloudflare_image_id
 *  5) placeholder
 *
 * Returns { src, kind, alt } where:
 *   - kind: "id" (Cloudflare IMAGE_ID → client loader) or "url" (direct URL → unoptimized)
 */
function resolveSubImage(sub: SubAsset): { src: string; kind: "id" | "url"; alt: string } {
  const prodImgs = productImages as ProductImagesMap;

  // 1) productImages.json by slug
  const pi = prodImgs[sub.slug];
  if (pi?.imageId) return { src: pi.imageId, kind: "id", alt: pi.description || sub.name };
  if (pi?.imageUrl) return { src: pi.imageUrl, kind: "url", alt: pi.description || sub.name };

  // 2) images.json by subcategory_id
  const rows = (imagesJson as ImagesRow[]).filter(
    (r) => Number(r.subcategory_id) === Number(sub.id)
  );
  const withCf = rows.find((r) => !!r.cloudflare_id);
  if (withCf?.cloudflare_id) return { src: withCf.cloudflare_id, kind: "id", alt: sub.name };

  const withName = rows.find((r) => !!r.image_name);
  if (withName?.image_name) {
    const name = withName.image_name;
    const isAbs =
      name.startsWith("http://") || name.startsWith("https://") || name.startsWith("/");
    const url = isAbs ? name : `/images/${name}`;
    return { src: url, kind: "url", alt: sub.name };
  }

  // 3) productAssets.json by slug/name
  const prodId = findProductAssetIdForSub(sub, productAssets as unknown as ProductAsset[]);
  if (prodId) return { src: prodId, kind: "id", alt: sub.name };

  // 4) subcategoryAssets.json field
  if (sub.cloudflare_image_id) return { src: sub.cloudflare_image_id, kind: "id", alt: sub.name };

  // 5) placeholder
  return { src: "/placeholder.png", kind: "url", alt: sub.name };
}

/* ──────────────────────────────────────────────────────────────────────────
   Page
────────────────────────────────────────────────────────────────────────── */
export default function CategoryPage({
  params,
}: {
  params: { categorySlug: string };
}) {
  const { categorySlug } = params;

  const catMap = categoryAssets as unknown as CategoryAssetMap;
  const cat = catMap[categorySlug];
  if (!cat) return notFound();

  const subs = (subcategoryAssets as unknown as SubAsset[]).filter(
    (s) => s.category_id === categorySlug
  );

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

      {subs.length === 0 ? (
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
          {subs.map((s) => {
            const resolved = resolveSubImage(s);
            return (
              <li
                key={s.slug}
                className="category-card"
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#fff",
                  padding: 16,
                  width: "100%",
                  maxWidth: 360,
                  textAlign: "center",
                }}
              >
                <Link
                  href={`/category/${categorySlug}/${s.slug}`}
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
