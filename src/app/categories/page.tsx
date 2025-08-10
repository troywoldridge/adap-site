// src/app/categories/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import CategoryGrid from "@/components/CategoryGrid";
import { getLocalCategories } from "@/lib/catalogLocal";

const HERO_IMAGE =
  "https://imagedelivery.net/<YOUR_CLOUDFLARE_HASH>/<YOUR_CATEGORIES_HERO_IMAGE_ID>/public";

export const metadata: Metadata = {
  title: "Shop All Print Categories | American Design And Printing",
  description:
    "Explore all premium print product categories at American Design And Printing. Find business cards, brochures, banners, and more—powered by Sinalite for blazing-fast turnaround!",
};

export default function CategoriesPage() {
  // Pull straight from local JSON (no network, no store code needed)
  const categories = getLocalCategories(); // returns [{ id, slug, name, description, image }]

  if (!categories.length) {
    return (
      <main className="container py-12 text-center">
        <h1 className="text-xl font-bold">No categories found!</h1>
        <p>Please check your local data files in <code>src/data</code>.</p>
      </main>
    );
  }

  return (
    <main className="container shop-by-category">
      <section className="category-intro">
        <h1 className="section-title">Shop by Category</h1>
        <p className="category-intro__desc">
          All the best print products, organized for easy browsing. Click a category to discover our full lineup!
        </p>
        <div className="flex flex-col items-center my-7">
          <Image
            src={HERO_IMAGE}
            alt="All Print Categories"
            width={820}
            height={250}
            className="category-hero-img"
            priority
            unoptimized
          />
          <Link
            href="/products"
            className="mt-3 inline-block px-7 py-2.5 rounded-lg bg-[var(--color-blue)] text-white font-semibold text-lg shadow-md transition hover:bg-[var(--color-black)]"
          >
            Shop All Products
          </Link>
        </div>
      </section>

      {/* CategoryGrid expects an array of categories with id, slug, name, image, description */}
      <CategoryGrid categories={categories} />
    </main>
  );
}
