// src/app/category/[categorySlug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// Local data
import categoryAssets from "@/data/categoryAssets.json";
import subcategoryAssets from "@/data/subcategoryAssets.json";
import { cfUrl } from "@/lib/data"; // builds CF image URL (falls back to /images)

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
  category_id: string; // matches category slug, e.g. "business-cards"
  slug: string;
  name: string;
  description?: string | null;
  cloudflare_image_id?: string | null;
};

export default function CategoryPage({
  params,
}: {
  params: { categorySlug: string };
}) {
  const { categorySlug } = params;

  // Category info from local map (object keyed by slug)
  const catMap = categoryAssets as unknown as CategoryAsset;
  const cat = catMap[categorySlug];
  if (!cat) {
    return notFound();
  }

  // Filter subcategories that belong to this category (by slug)
  const subs = (subcategoryAssets as SubAsset[]).filter(
    (s) => s.category_id === categorySlug
  );

  return (
    <main className="container" style={{ padding: 24 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>
          {categorySlug
            .replace(/[_-]+/g, " ")
            .replace(/\b\w/g, (m) => m.toUpperCase())}
        </h1>
        {cat.description ? (
          <p style={{ marginTop: 8, color: "#555" }}>{cat.description}</p>
        ) : null}
      </header>

      {subs.length === 0 ? (
        <p>No subcategories found for this category.</p>
      ) : (
        <ul
          className="category-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
            padding: 0,
            listStyle: "none",
          }}
        >
          {subs.map((s) => {
            const imgUrl = s.cloudflare_image_id
              ? cfUrl(s.cloudflare_image_id)
              : "/images/placeholder.png";

            return (
              <li
                key={s.slug}
                className="category-card"
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#fff",
                  padding: 16,
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
                      sizes="(max-width: 768px) 50vw, 240px"
                      className="category-card__image"
                      style={{ objectFit: "cover" }}
                      unoptimized
                    />
                  </div>
                  <h3 style={{ margin: "0 0 6px" }}>
                    {s.name.replace(/[_-]+/g, " ")}
                  </h3>
                  {s.description ? (
                    <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
                      {s.description}
                    </p>
                  ) : null}
                </Link>

                {/* Disabled CTA (no onClick in a server component) */}
                <div style={{ marginTop: 12 }}>
                  <span
                    role="button"
                    aria-disabled="true"
                    title="Coming soon"
                    style={{
                      display: "inline-block",
                      padding: "10px 16px",
                      background: "var(--color-blue)",
                      color: "#fff",
                      borderRadius: 8,
                      textDecoration: "none",
                      fontWeight: 600,
                      opacity: 0.6,
                      cursor: "not-allowed",
                    }}
                  >
                    Customize (coming soon)
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
