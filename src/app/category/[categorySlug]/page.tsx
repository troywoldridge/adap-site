import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import categoryAssets from "@/data/categoryAssets.json";
import subcategoryAssets from "@/data/subcategoryAssets.json";
import productAssets from "@/data/productAssets.json";
import { cfUrl, getImageBySubcategoryId, getImageByName } from "@/lib/data"; // CF + lookups

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
  id: number;
  name: string;
  slug: string;
  cloudflare_image_id: string | null;
  description?: string | null;
};

// 🔎 image resolver (prefers images.json mapping)
function imageForSub(s: SubAsset): string {
  // 1) images.json by subcategory_id (authoritative)
  const bySub = getImageBySubcategoryId(s.id);
  if (bySub.record) return bySub.url;

  // 2) subcategory's own id
  if (s.cloudflare_image_id) return cfUrl(s.cloudflare_image_id);

  // 3) productAssets fallback (slug/name)
  const products = productAssets as unknown as ProductAsset[];
  const simple = (t: string) => t.toLowerCase().replace(/[_-]+/g, " ").trim();

  const bySlug = products.find((p) => p.slug === s.slug && p.cloudflare_image_id);
  if (bySlug?.cloudflare_image_id) return cfUrl(bySlug.cloudflare_image_id);

  const byNameProd = products.find(
    (p) =>
      p.cloudflare_image_id &&
      (simple(p.slug) === simple(s.slug) ||
        simple(p.name) === simple(s.name) ||
        simple(p.name).includes(simple(s.name)))
  );
  if (byNameProd?.cloudflare_image_id) return cfUrl(byNameProd.cloudflare_image_id);

  // 4) images.json by "name"
  const byNameImg = getImageByName(s.name);
  if (byNameImg.record) return byNameImg.url;

  // 5) placeholder
  return cfUrl(null);
}

export default function CategoryPage({ params }: { params: { categorySlug: string } }) {
  const { categorySlug } = params;

  const catMap = categoryAssets as unknown as CategoryAsset;
  const cat = catMap[categorySlug];
  if (!cat) return notFound();

  const subs = (subcategoryAssets as SubAsset[]).filter(
    (s) => s.category_id === categorySlug
  );

  const title = categorySlug
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

  return (
    <main className="container" style={{ padding: 24 }}>
      <header className="category-intro">
        <h1 className="section-title">{title}</h1>
        {cat.description ? (
          <p className="category-intro__desc">{cat.description}</p>
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
            const imgUrl = imageForSub(s);

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
                    <Image
                      src={imgUrl}
                      alt={s.description || s.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 360px"
                      className="category-card__image"
                      style={{ objectFit: "cover" }}
                      priority={false}
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
