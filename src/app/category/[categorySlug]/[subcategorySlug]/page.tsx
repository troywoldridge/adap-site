// src/app/category/[categorySlug]/[subcategorySlug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import categoryAssets from "@/data/categoryAssets.json";
import subcategoryAssets from "@/data/subcategoryAssets.json";
import productAssetsRaw from "@/data/productAssets.json";

import { humanizeName } from "@/lib/data";
import { productImagesForProductId } from "@/lib/product-images";
import { getSinaliteProductMeta } from "@/lib/sinalite.client";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────── */
type CategoryAsset = {
  [slug: string]: {
    imageId?: string | null;
    imageUrl?: string | null;
    description?: string | null;
    variant?: string | null;
  };
};

type SubAsset = {
  id: number;
  category_id: string;   // matches category slug
  slug: string;
  name: string;
  description?: string | null;
  cloudflare_image_id?: string | null;
};

type ProductAsset = {
  category_id?: string | number;
  subcategory_id?: string | number;
  name?: string;
  image_name?: string;
  cloudflare_id?: string | null;
  product_id: number | string;
  matched_sku?: string | null;
};

/* ──────────────────────────────────────────────────────────
   Local data coercion + helpers
   ────────────────────────────────────────────────────────── */
const productAssets: ProductAsset[] = Array.isArray(productAssetsRaw)
  ? (productAssetsRaw as ProductAsset[])
  : [];

/** Prefer API meta name; else SKU/name fallbacks. */
function titleFromMetaOrLocal(meta: any | null, p: ProductAsset): string {
  const apiName = (meta?.name ?? "").toString().trim();
  if (apiName) return apiName;

  const sku = (meta?.sku ?? p.matched_sku ?? "").toString().trim();
  if (sku) return humanizeName(sku);

  if (p.name) return humanizeName(p.name);

  return `Product ${p.product_id}`;
}

/** Dedupe by product_id while preserving first occurrence order. */
function dedupeByProductId(rows: ProductAsset[]) {
  const seen = new Set<string>();
  const out: ProductAsset[] = [];
  for (const r of rows) {
    const id = String(r.product_id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(r);
  }
  return out;
}

/* ──────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────── */
export default async function SubcategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string; subcategorySlug: string }>;
}) {
  const { categorySlug, subcategorySlug } = await params;

  // Validate category
  const catMap = categoryAssets as unknown as CategoryAsset;
  const cat = catMap[categorySlug];
  if (!cat) return notFound();

  // All subs under this category
  const subs = (subcategoryAssets as SubAsset[]).filter(
    (s) => s.category_id === categorySlug
  );
  if (!subs.length) return notFound();

  // Current subcategory
  const sub = subs.find((s) => s.slug === subcategorySlug);
  if (!sub) return notFound();

  // Products mapped to this subcategory → DEDUPE by product_id
  const subId = Number(sub.id);
  const mappedProductsRaw = productAssets.filter(
    (p) => Number(p.subcategory_id) === subId && p.product_id != null
  );
  const mappedProducts = dedupeByProductId(mappedProductsRaw);

  // Fetch live meta (SinaLite docs) + Cloudflare image per product
  const productsWithMeta = await Promise.all(
    mappedProducts.map(async (p) => {
      const id = String(p.product_id);
      const cfImage =
        productImagesForProductId(id)[0] ||
        "https://imagedelivery.net/placeholder/placeholder/public";

      try {
        const meta = await getSinaliteProductMeta(id);
        return {
          id,
          title: titleFromMetaOrLocal(meta, p),
          category: meta?.category ?? "",
          image: cfImage, // Cloudflare CDN URL
        };
      } catch {
        return {
          id,
          title: titleFromMetaOrLocal(null, p),
          category: "",
          image: cfImage,
        };
      }
    })
  );

  // Stable sort for consistent UX
  productsWithMeta.sort((a, b) => a.title.localeCompare(b.title));

  const titleCat = categorySlug
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
  const titleSub = sub.name.replace(/[_-]+/g, " ");

  return (
    <main className="container" style={{ padding: 24 }}>
      <header className="category-intro" style={{ textAlign: "center", marginBottom: 16 }}>
        <h1 className="section-title" style={{ margin: 0 }}>
          {titleCat} — {titleSub}
        </h1>
        {sub.description ? (
          <p className="category-intro__desc" style={{ marginTop: 8 }}>
            {sub.description}
          </p>
        ) : null}
      </header>

      {productsWithMeta.length === 0 ? (
        <p className="category-intro__desc" style={{ textAlign: "center" }}>
          No products are mapped to this subcategory yet.
        </p>
      ) : (
        <ul
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
            padding: 0,
            listStyle: "none",
            maxWidth: 1200,
            margin: "0 auto",
            justifyItems: "center",
          }}
        >
          {productsWithMeta.map((p) => (
            <li
              key={`${subcategorySlug}-${p.id}`}
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
                href={`/product/${p.id}`}
                title={p.title}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                <div
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
                  <Image
                    src={p.image}
                    alt={p.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 360px"
                    style={{ objectFit: "cover" }}
                    priority={false}
                  />
                </div>
                <h3 style={{ margin: "0 0 6px" }}>{p.title}</h3>
                {p.category ? (
                  <p style={{ margin: 0, color: "#666", fontSize: 14 }}>{p.category}</p>
                ) : null}
              </Link>

              <div style={{ marginTop: 12 }}>
                <Link
                  href={`/product/${p.id}`}
                  className="shipping-estimator__button"
                  style={{
                    display: "inline-block",
                    padding: "10px 16px",
                    background: "var(--color-blue)",
                    color: "#fff",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  Customize
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
