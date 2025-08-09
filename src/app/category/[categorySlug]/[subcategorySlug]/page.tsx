// src/app/category/[categorySlug]/[subcategorySlug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { categories, subcategories, products } from "@/lib/data";

interface Params {
  categorySlug: string;
  subcategorySlug: string;
}

 const sub = subcategories.find(s => s.slug === params.subcategorySlug)
   const prods = products.filter(p => p.subcategoryId === sub.id)

// 1️⃣ Tell Next which subcategory paths to prerender
export async function generateStaticParams(): Promise<Params[]> {
  return subcategories.map((s) => {
    const cat = categories.find((c) => c.id === s.categoryId)!;
    return { categorySlug: cat.slug, subcategorySlug: s.slug };
  });
}

// 2️⃣ Set <head> metadata per‐subcategory
export function generateMetadata({ params }: { params: Params }): Metadata {
  const cat = categories.find((c) => c.slug === params.categorySlug);
  const sub = subcategories.find(
    (s) => s.slug === params.subcategorySlug && s.categoryId === cat?.id
  );
  const title = sub ? `${cat?.name} / ${sub.name}` : "Subcategory";
  return {
    title: `${title} – Custom Print Experts`,
    description: `Explore ${sub?.name} within ${cat?.name}.`,
  };
}

// 3️⃣ Server component: build and render
export default function SubcategoryPage({ params }: { params: Params }) {
  const cat = categories.find((c) => c.slug === params.categorySlug);
  const sub = subcategories.find(
    (s) => s.slug === params.subcategorySlug && s.categoryId === cat?.id
  );

  if (!cat || !sub) {
    return (
      <main className="container py-8">
        <h1 className="text-2xl font-bold">Subcategory not found</h1>
      </main>
    );
  }

  // Grab its products
  const prods = products.filter(
    (p) => p.subcategoryId === sub.id && p.enabled
  );

  return (
    <main className="container py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold">
          {cat.name} &rsaquo; {sub.name}
        </h1>
        {sub.image && (
          <div className="mt-4 w-full h-56 relative">
            <Image
              src={sub.image}
              alt={sub.name}
              fill
              className="object-cover rounded-lg"
            />
          </div>
        )}
      </header>

      {/* Products grid */}
      {prods.length === 0 ? (
        <p>No products found in this subcategory.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {prods.map((p) => (
            <li key={p.id}>
              <Link
                href={`/products/${p.id}`}
                className="block bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition"
              >
                {p.image && (
                  <div className="relative w-full h-48">
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  <span className="mt-2 inline-block text-sm text-blue-600">
                    View details
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
