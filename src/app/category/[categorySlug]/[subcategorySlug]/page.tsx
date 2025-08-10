// src/app/category/[categorySlug]/[subcategorySlug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import categoryAssets from "@/data/categoryAssets.json";
import subcategoryAssets from "@/data/subcategoryAssets.json";
import { cfUrl } from "@/lib/data"; // your CF helper

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
  category_id: string;  // category slug, e.g. "business-cards"
  slug: string;         // subcategory slug, e.g. "standard-business-cards-1"
  name: string;         // "standard_business_cards"
  description?: string | null;
  cloudflare_image_id?: string | null;
};

export default function SubcategoryPage({
  params,
}: {
  params: { categorySlug: string; subcategorySlug: string };
}) {
  const { categorySlug, subcategorySlug } = params;

  // 1) Validate category
  const catMap = categoryAssets as unknown as CategoryAsset;
  const cat = catMap[categorySlug];
  if (!cat) {
    return notFound();
  }

  // 2) Load all subs for this category from local JSON
  const subs = (subcategoryAssets as SubAsset[]).filter(
    (s) => s.category_id === categorySlug
  );
  if (!subs.length) {
    return notFound();
  }

  // 3) Pick the current sub
  const sub = subs.find((s) => s.slug === subcategorySlug);
  if (!sub) {
    return notFound();
  }

  // 4) Image
  const heroImg =
    sub.cloudflare_image_id ? cfUrl(sub.cloudflare_image_id) : "/images/placeholder.png";

  return (
    <main className="container" style={{ padding: 24 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>
          {cat ? categorySlug.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) : categorySlug}
          {" — "}
          {sub.name.replace(/[_-]+/g, " ")}
        </h1>
        {sub.description ? (
          <p style={{ marginTop: 8, color: "#555" }}>{sub.description}</p>
        ) : null}
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24, alignItems: "start" }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "4 / 3",
            overflow: "hidden",
            borderRadius: 8,
            background: "#f5f5f5",
          }}
        >
          <Image
            src={heroImg}
            alt={sub.description || sub.name}
            fill
            sizes="(max-width: 768px) 90vw, 360px"
            style={{ objectFit: "cover" }}
            unoptimized
          />
        </div>

        <div>
          <p style={{ marginTop: 0, color: "#333" }}>
            Products for <strong>{sub.name.replace(/[_-]+/g, " ")}</strong> come from your local
            <code> subcategoryAssets.json</code>. If/when you want this to jump into a real product page,
            add a mapping from this subcategory to a Sinalite productId (or SKU) and link the button below.
          </p>

          {/* Replace the href once you have a mapping to real product IDs */}
          <Link
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{
              display: "inline-block",
              padding: "10px 16px",
              background: "var(--color-blue)",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
            }}
            title="Coming soon"
          >
            Customize (coming soon)
          </Link>
        </div>
      </section>

      {/* Sibling subcategories carousel/grid */}
      {subs.length > 1 && (
        <>
          <h2 style={{ marginTop: 32, marginBottom: 12 }}>More in this category</h2>
          <ul
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 16,
              padding: 0,
              listStyle: "none",
            }}
          >
            {subs
              .filter((s) => s.slug !== sub.slug)
              .map((s) => {
                const thumb =
                  s.cloudflare_image_id ? cfUrl(s.cloudflare_image_id) : "/images/placeholder.png";
                return (
                  <li
                    key={s.slug}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      background: "#fff",
                      padding: 12,
                    }}
                  >
                    <Link
                      href={`/category/${categorySlug}/${s.slug}`}
                      title={s.name}
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
                          marginBottom: 8,
                        }}
                      >
                        <Image
                          src={thumb}
                          alt={s.description || s.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 220px"
                          style={{ objectFit: "cover" }}
                          unoptimized
                        />
                      </div>
                      <h3 style={{ margin: 0, fontSize: 16 }}>
                        {s.name.replace(/[_-]+/g, " ")}
                      </h3>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </>
      )}
    </main>
  );
}
