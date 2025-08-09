// src/app/categories/page.tsx
import { getCategories } from "@/lib/sinalite.client";
import { mergeCategory } from "@/lib/mergeUtils";
import CategoryGrid from "@/components/CategoryGrid";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

const HERO_IMAGE = "https://imagedelivery.net/<YOUR_CLOUDFLARE_HASH>/<YOUR_CATEGORIES_HERO_IMAGE_ID>/public";

export const metadata: Metadata = {
  title: "Shop All Print Categories | American Design And Printing",
  description:
    "Explore all premium print product categories at American Design And Printing. Find business cards, brochures, banners, and more—all powered by Sinalite for blazing-fast turnaround!",
};

export default async function CategoriesPage() {
  const storeCode = process.env.NEXT_PUBLIC_STORE_CODE;
  if (!storeCode) {
    return (
      <main className="container py-12 text-center">
        <h1 className="text-2xl font-bold text-red-600">Missing Store Code!</h1>
        <p>Please set <code>NEXT_PUBLIC_STORE_CODE</code> in your environment variables.</p>
      </main>
    );
  }

  let categories: any[] = [];
  try {
    categories = await getCategories(storeCode);
  } catch {
    return (
      <main className="container py-12 text-center">
        <h1 className="text-xl font-bold text-red-600">Unable to load categories</h1>
        <p>Check your Sinalite API connection.</p>
      </main>
    );
  }

  const mergedCategories = categories.map(mergeCategory);

  if (!mergedCategories.length) {
    return (
      <main className="container py-12 text-center">
        <h1 className="text-xl font-bold">No categories found!</h1>
        <p>Please check your store setup or contact support.</p>
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
      <CategoryGrid categories={mergedCategories} />
    </main>
  );
}
