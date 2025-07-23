// src/lib/queries/getNavbarData.ts
import { listProducts, SinaliteProduct } from '@/lib/sinalite/products';

export interface NavSub {
  slug: string;  // same as SKU
  name: string;
}
export interface NavCat {
  name: string;
  slug: string;  // category-kebab
  subcategories: NavSub[];
}

export async function getNavbarData(): Promise<NavCat[]> {
  const all = await listProducts();
  const byCat = new Map<string, Set<NavSub>>();

  all.forEach((p) => {
    if (!p.enabled) {
      return;
    }
    const catSlug = p.category.toLowerCase().replace(/\s+/g,'-');
    const set = byCat.get(catSlug) ?? new Set();
    set.add({ slug: p.sku, name: p.name });
    byCat.set(catSlug, set);
  });

  return Array.from(byCat.entries()).map(([slug, subs]) => ({
    slug,
    name: slug.replace(/-/g,' ').replace(/\b\w/g,(m)=>m.toUpperCase()),
    subcategories: Array.from(subs),
  }));
}
