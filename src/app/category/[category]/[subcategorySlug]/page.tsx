import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { categories, subcategories, products } from "@/drizzle/migrations/schema";
import Image from "next/image";
import { SUBCATEGORY_ASSETS } from "@/lib/categoryAssets";
import Link from "next/link";

// Fake product data (REPLACE with your DB call!)
const FAKE_PRODUCTS = [
  { name: "Premium Flyer", slug: "premium-flyer", image: "/images/prod-flyer1.jpg" },
  { name: "Eco Postcard", slug: "eco-postcard", image: "/images/prod-postcard1.jpg" },
  { name: "Deluxe Brochure", slug: "deluxe-brochure", image: "/images/prod-brochure1.jpg" },
];

function toTitle(str: string) {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function getSubcategory(categorySlug: string, subSlug: string) {
  // get parent cat
  const cat = await db.query.categories.findFirst({ where: (c, { eq }) => eq(c.slug, categorySlug) });
  if (!cat) return null;
  // get subcat
  const sub = await db.query.subcategories.findFirst({
    where: (s, { eq, and }) => and(eq(s.slug, subSlug), eq(s.categoryId, cat.id)),
  });
  if (!sub) return null;
  // TODO: Fetch real products for this subcat!
  return { category: cat, subcategory: sub, products: FAKE_PRODUCTS };
}

export default async function SubcategoryPage({
  params,
}: {
  params: { category: string; subcategory: string };
}) {
  const data = await getSubcategory(params.category, params.subcategory);
  if (!data) return notFound();

  const subAsset = SUBCATEGORY_ASSETS[data.subcategory.slug] || {};

  return (
    <main className="cat-landing">
      <section className="cat-hero">
        {subAsset.imageUrl && (
          <div className="cat-hero-img">
            <Image src={subAsset.imageUrl} alt={data.subcategory.name} fill style={{ objectFit: "cover" }} />
          </div>
        )}
        <div className="cat-hero-info">
          <h1>{toTitle(data.subcategory.name)}</h1>
          <p className="cat-hero-desc">{subAsset.description || data.subcategory.description}</p>
        </div>
      </section>
      <section>
        <h2 className="cat-section-title">Products in {toTitle(data.subcategory.name)}</h2>
        <div className="subcat-product-grid">
          {data.products.length === 0 && (
            <div style={{ fontSize: "1.1rem", color: "#888" }}>
              No products found in this subcategory yet.
            </div>
          )}
          {data.products.map((prod) => (
            <Link
              key={prod.slug}
              href={`/product/${prod.slug}`}
              className="subcat-product-card"
            >
              {prod.image && (
                <div style={{ position: "relative", width: "100%", height: "120px", borderRadius: "10px", overflow: "hidden" }}>
                  <Image src={prod.image} alt={prod.name} fill style={{ objectFit: "cover" }} />
                </div>
              )}
              <div style={{ padding: "0.8rem 0 0 0" }}>
                <div className="subcat-product-title">{toTitle(prod.name)}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
