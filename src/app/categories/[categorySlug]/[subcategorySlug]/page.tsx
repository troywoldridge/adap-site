// src/app/category/[categorySlug]/[subcategorySlug]/page.tsx
import { notFound } from "next/navigation";
import {
  getLocalCategoryBySlug,
  getLocalSubcategories,
} from "@/lib/catalogLocal";

export default function SubcategoryPage({
  params,
}: {
  params: { categorySlug: string; subcategorySlug: string };
}) {
  const { categorySlug, subcategorySlug } = params;

  // Category by slug (from local JSON)
  const category = getLocalCategoryBySlug(categorySlug);
  if (!category) {
    return notFound();
  }

  // Subcategories for this category, then pick by slug
  const subs = getLocalSubcategories(category.slug);
  const sub = subs.find((s) => s.slug === subcategorySlug);
  if (!sub) {
    return notFound();
  }

  return (
    <main className="container" style={{ padding: 24 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>
          {category.name} — {sub.name.replace(/[_-]+/g, " ")}
      </h1>
        {sub.description ? (
          <p style={{ marginTop: 8, color: "#555" }}>{sub.description}</p>
        ) : null}
      </header>

      {/* TODO: plug real product list here (Algolia or local).
          For now, just a placeholder. */}
      <section>
        <p>Products for <strong>{sub.name}</strong> will render here.</p>
      </section>
    </main>
  );
}
