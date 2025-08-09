import { getProductsBySubcategory, getSubcategoryDetails } from "@/lib/sinalite.client";
import { mergeProduct, mergeSubcategory } from "@/lib/mergeUtils";
import ProductGrid from "@/components/ProductGrid";
import Image from "next/image";
import type { Metadata } from "next";

// --- Dynamic SEO per subcategory page ---
export async function generateMetadata({ params }: { params: { subcategoryId: string } }): Promise<Metadata> {
  // Get subcategory details for SEO
  const subcat = mergeSubcategory({ id: params.subcategoryId });
  return {
    title: subcat?.name ? `${subcat.name} | Shop Print Products` : "Shop Print Products | American Design And Printing",
    description: subcat?.description || "Shop our print product lineup by subcategory.",
    openGraph: {
      title: subcat?.name || "Shop Print Products",
      description: subcat?.description || "",
      images: subcat?.image ? [subcat.image] : [],
    },
  };
}

export default async function SubcategoryProductsPage({ params }: { params: { subcategoryId: string } }) {
  const { subcategoryId } = params;
  const storeCode = process.env.NEXT_PUBLIC_STORE_CODE!;
  
  // Fetch subcategory details for the hero section
  const subcat = mergeSubcategory({ id: subcategoryId });
  
  // Fetch and merge all products in this subcategory
  let products: any[] = [];
  try {
    products = await getProductsBySubcategory(subcategoryId, storeCode);
  } catch {
    return (
      <main className="container py-12 text-center">
        <h1 className="text-xl font-bold text-red-600">Unable to load products</h1>
        <p>Check your Sinalite API connection.</p>
      </main>
    );
  }
  const mergedProducts = products.map(mergeProduct);

  return (
    <main className="container">
      {/* Subcategory hero/intro */}
      <section className="category-intro">
        {subcat?.image && (
          <Image
            src={subcat.image}
            alt={subcat?.name || "Subcategory Hero"}
            width={820}
            height={250}
            className="category-hero-img"
            priority
            unoptimized
          />
        )}
        <h1 className="section-title">{subcat?.name || "Products"}</h1>
        <p className="category-intro__desc">
          {subcat?.description || "Explore all products in this collection below."}
        </p>
      </section>

      {/* Product grid */}
      <ProductGrid products={mergedProducts} />
    </main>
  );
}
