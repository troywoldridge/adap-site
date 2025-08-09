// src/lib/data.ts
import slugify from 'slugify';
import mappingRaw from '@/data/imageMap.clean.json';

export interface Category {
  id: number;
  slug: string;
  name: string;
}
export interface Subcategory {
  id: number;
  categoryId: number;
  slug: string;
  name: string;
}
export interface ProductEntry {
  id: number;
  sku: string;
  name: string;
  categoryId: number;
  subcategoryId: number;
  imageUrl: string | null;
}

// 1️⃣ Turn the raw import into a typed array
const mapEntries: {
  category_id: number;
  subcategory_id: number;
  name: string;
  image_name: string;
  cloudflare_id: string | null;
  product_id: number | null;
  matched_sku: string | null;
}[] = Array.isArray(mappingRaw) ? mappingRaw : Object.values(mappingRaw);

// 2️⃣ Build unique categories
export const categories: Category[] = Array.from(
  new Map(
    mapEntries
      .map((e) => {
        return {
          id: e.category_id,
          // title-case the numeric ID if you don't have a human name
          name: `Category ${e.category_id}`,
          slug: String(e.category_id),
        } as Category;
      })
      .map((c) => [c.id, c])
  ).values()
);

// 3️⃣ Build unique subcategories
export const subcategories: Subcategory[] = Array.from(
  new Map(
    mapEntries
      .map((e) => {
        const raw = e.name; // your mapping “name” is actually the subcategory slug
        const slug = slugify(raw, { lower: true, strict: true });
        const title = raw.replace(/[_-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        return {
          id: e.subcategory_id,
          categoryId: e.category_id,
          slug,
          name: title,
        } as Subcategory;
      })
      .map((s) => [s.id, s])
  ).values()
);

// 4️⃣ Build the products array
const BASE = `${process.env.NEXT_PUBLIC_IMAGE_DELIVERY_BASE}/${process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH}`;

export const products: ProductEntry[] = mapEntries
  .filter((e) => e.product_id !== null)        // drop any entries without products
  .map((e) => {
    const id = e.product_id!;
    const sku = e.matched_sku ?? String(id);
    const title = sku.replace(/[_-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    const imageUrl = e.cloudflare_id
      ? `${BASE}/${e.cloudflare_id}/public`
      : null;

    return {
      id,
      sku,
      name: title,
      categoryId: e.category_id,
      subcategoryId: e.subcategory_id,
      imageUrl,
    };
  });

// Now you can do in your pages:
// import { categories, subcategories, products } from '@/lib/data';
//
// CategoryPage:
//   const cat = categories.find(c => c.slug === params.categorySlug)
//   const subs = subcategories.filter(s => s.categoryId === cat.id)
//
// SubcategoryPage:
//   const sub = subcategories.find(s => s.slug === params.subcategorySlug)
//   const prods = products.filter(p => p.subcategoryId === sub.id)
//
// ProductPage:
//   const product = products.find(p => p.id === Number(params.id))
//   // then call Sinalite API via p.sku or p.id, and show p.imageUrl as the hero image
