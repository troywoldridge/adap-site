// src/app/category/[lug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import categoryAssets from "@/data/categoryAssets.json";
import subcategoryAssets from "@/data/subcategoryAssets.json";
import productAssets from "@/data/productAssets.json";
import productImages from "@/data/productImages.json";

interface Params { slug: string; }

// 1️⃣  Tell Next which slugs to prerender
export async function generateStaticParams(): Promise<Params[]> {
  return Object.keys(categoryAssets).map((slug) => ({ slug }));
}

// 2️⃣  Humanize “foo-bar” → “Foo Bar”
function toTitleCase(slug: string) {
  return slug
    .split(/[-_]/)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

// 3️⃣  Set <head> metadata per‐category
export function generateMetadata({ params }: { params: Params }): Metadata {
  const cat = (categoryAssets as Record<string, any>)[params.slug];
  const title = toTitleCase(params.slug);
  return {
    title: `${title} – Custom Print Experts`,
    description: cat?.description,
  };
}

// 4️⃣  Server component: build and render
export default function CategoryPage({ params }: { params: Params }) {
  const {slug} = params;
  const category = (categoryAssets as Record<string, any>)[slug];
  if (!category) {
    return (
      <main className="container">
        <h1 className="section-title">Category not found</h1>
      </main>
    );
  }

  const categoryName = toTitleCase(slug);

  // Build dynamic list of subcategories
  const subs = (subcategoryAssets as any[])
    .filter((sc) => sc.category_id === slug)
    .map((sc) => {
      const title = toTitleCase(sc.name);
      // 1) First try productImages.json
      const imgJson = (productImages as Record<string, any>)[sc.name];
      if (imgJson) {
        return {
          id: sc.id,
          title,
          desc: sc.description,
          href: `/products/${sc.slug}`,
          imgSrc: `https://imagedelivery.net/${process.env.NEXT_PUBLIC_CF_ACCOUNT}/${imgJson.imageId}/${imgJson.variant}`,
        };
      }
      // 2) Fallback to first matching productAssets
      const prod = (productAssets as any[]).find(
        (p) => Number(p.subcategory_id) === sc.id
      );
      if (prod?.cloudflare_id) {
        return {
          id: sc.id,
          title,
          desc: sc.description,
          href: `/products/${sc.slug}`,
          imgSrc: `https://imagedelivery.net/${process.env.NEXT_PUBLIC_CF_ACCOUNT}/${prod.cloudflare_id}/public`,
        };
      }
      // 3) Final fallback to the category’s main imageUrl
      return {
        id: sc.id,
        title,
        desc: sc.description,
        href: `/products/${sc.slug}`,
        imgSrc: category.imageUrl,
      };
    });

  return (
    <main className="container">
      {/* ——— Intro ——— */}
      <section className="category-intro">
        <h1 className="section-title">{categoryName}</h1>
        {category.description && (
          <p className="category-intro__desc">{category.description}</p>
        )}
      </section>

      {/* ——— Sub-category Grid ——— */}
      {subs.length === 0 ? (
        <p className="text-center">No types available.</p>
      ) : (
        <ul className="subcategory-grid">
          {subs.map(({ id, title, desc, href, imgSrc }) => (
            <li key={id}>
              <article className="subcategory-card">
                <Link href={href} className="block">
                  <div className="subcategory-card__image-wrap">
                    <Image
                      src={imgSrc}
                      alt={title}
                      fill
                      className="subcategory-card__image"
                      sizes="(min-width:640px)260px,100vw"
                    />
                  </div>
                  <h3 className="subcategory-card__title">{title}</h3>
                  <p className="subcategory-card__desc">{desc}</p>
                  <span className="subcategory-card__btn">
                    Browse {title}
                  </span>
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
