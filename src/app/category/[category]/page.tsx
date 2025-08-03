import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { categories, subcategories } from "@/drizzle/migrations/schema";
import Link from "next/link";
import Image from "next/image";
import { CATEGORY_ASSETS, SUBCATEGORY_ASSETS } from "@/lib/categoryAssets";

// Utility: Title case + no underscores
function toTitle(str: string) {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function getCategoryWithSubcats(slug: string) {
  const cat = await db.query.categories.findFirst({ where: (c, { eq }) => eq(c.slug, slug) });
  if (!cat) return null;
  const subcats = await db.query.subcategories.findMany({
    where: (s, { eq }) => eq(s.categoryId, cat.id),
  });
  return { ...cat, subcategories: subcats };
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const cat = await getCategoryWithSubcats(params.category);
  if (!cat) return notFound();

  const asset = CATEGORY_ASSETS[cat.slug] || {};

  return (
    <main className="cat-landing">
      <section className="cat-hero">
        {asset.imageUrl && (
          <div className="cat-hero-img">
            <Image src={asset.imageUrl} alt={cat.name} fill style={{ objectFit: "cover" }} />
          </div>
        )}
        <div className="cat-hero-info">
          <h1>{toTitle(cat.name)}</h1>
          <p className="cat-hero-desc">{asset.description || cat.description}</p>
        </div>
      </section>

      <section>
        <h2 className="cat-section-title">Explore {toTitle(cat.name)} Subcategories</h2>
        <div className="card-grid">
          {cat.subcategories.map((sub) => {
            const subAsset = SUBCATEGORY_ASSETS[sub.slug] || {};
            return (
              <Link
                key={sub.slug}
                href={`/category/${cat.slug}/${sub.slug}`}
                className="card"
              >
                {subAsset.imageUrl && (
                  <div className="card-img">
                    <Image
                      src={subAsset.imageUrl}
                      alt={sub.name}
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                )}
                <div className="card-body">
                  <h3 className="card-title">{toTitle(sub.name)}</h3>
                  <p className="card-desc">
                    {subAsset.description || sub.description || ""}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
