// lib/queries/getNavbarData.ts
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db"; // adjust if your actual client path differs
import { categories, subcategories } from "@/drizzle/migrations/schema"; // adjust path if needed

export type SubCat = {
  slug: string;
  name: string;
};

export type NavCat = {
  slug: string;
  name: string;
  subcategories?: SubCat[];
};

export async function getNavbarData(): Promise<NavCat[]> {
  // fetch categories, try ordering by sortOrder
  let cats: Array<{ slug: string; name: string; id: string }> = [];
  try {
    cats = await db
      .select({
        slug: categories.slug,
        name: categories.name,
        id: categories.id,
      })
      .from(categories)
      .orderBy(categories.sortOrder);
  } catch (err) {
    console.warn(
      "Ordering categories by sortOrder failed; falling back to unordered fetch.",
      err
    );
    cats = await db
      .select({
        slug: categories.slug,
        name: categories.name,
        id: categories.id,
      })
      .from(categories);
  }

  if (cats.length === 0) return [];

  const catIds = cats.map((c) => c.id);

  // fetch subcategories for those categories
  const subs = await db
    .select({
      category_id: subcategories.categoryId,
      slug: subcategories.slug,
      name: subcategories.name,
    })
    .from(subcategories)
    .where(inArray(subcategories.categoryId, catIds));

  // group by category ID
  const subsByCat: Record<string, SubCat[]> = {};
  subs.forEach((s) => {
    const cid = String(s.category_id);
    if (!subsByCat[cid]) subsByCat[cid] = [];
    subsByCat[cid].push({
      slug: s.slug,
      name: s.name,
    });
  });

  // assemble final structure
  return cats.map((c) => ({
    slug: c.slug,
    name: c.name,
    subcategories: subsByCat[String(c.id)] ?? [],
  }));
}
