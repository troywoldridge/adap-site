import { getSubcategories } from "@/lib/sinalite.client";
import { mergeSubcategory, mergeCategory } from "@/lib/mergeUtils";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

// Optional: add subcategory card component for cleaner grid!
import SubcategoryCard from "@/components/SubcategoryCard";

// --- Generate Metadata (Dynamic SEO for each category page!) ---
export async function generateMetadata({ params }: { params: { categoryId: string } }): Promise<Metadata> {
  // Optionally pull in name/desc for category hero
  const category = mergeCategory({ id: params.categoryId, slug: params.categoryId });
  return {
    title: category?.name
      ? `${category.name} | Print Products`
      : "Print Products | American Design And Printing",
    description: category?.description || "Browse our selection of premium print products and subcategories.",
    openGraph: {
      title: category?.name || "Print Products",
      description: category?.description || "",
      images: category?.image ? [category.image] : [],
    },
  };
}

export default async function CategoryPage({ params }: { params: { categoryId: string } }) {
  const { categoryId } = params;
  const storeCode = process.env.NEXT_PUBLIC_STORE_CODE!;
  // 1. Fetch subcategories for this category
  let subcategories: any[] = [];
  try {
    subcategories = await getSubcategories(categoryId, storeCode);
  } catch {
    return (
      <main className="container py-12 text-center">
        <h1 className="text-xl font-bold text-red-600">Unable to load subcategories</h1>
        <p>Check your Sinalite API connection.</p>
      </main>
    );
  }

  // 2. Merge subcategories with local assets for images/descriptions
  const mergedSubcategories = subcategories.map(mergeSubcategory);

  // 3. Get the category asset for hero section
  const category = mergeCategory({ id: categoryId, slug: categoryId });

  return (
    <main className="container">
      {/* --- Category Hero/Intro --- */}
      <section className="category-intro">
        {category?.image && (
          <Image
            src={category.image}
            alt={category?.name || "Category Hero"}
            width={820}
            height={250}
            className="category-hero-img"
            priority
            unoptimized
          />
        )}
        <h1 className="section-title">{category?.name || categoryId}</h1>
        <p className="category-intro__desc">
          {category?.description ||
            "Discover all the best subcategories and premium print products below."}
        </p>
      </section>

      {/* --- Subcategory Grid --- */}
      {mergedSubcategories.length ? (
        <ul className="subcategory-grid">
          {mergedSubcategories.map((subcat) => (
            <SubcategoryCard key={subcat.id} subcategory={subcat} />
          ))}
        </ul>
      ) : (
        <div className="py-16 text-center text-lg text-muted-foreground">
          No subcategories found for this category.
        </div>
      )}
    </main>
  );
}
