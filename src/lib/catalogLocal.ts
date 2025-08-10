// src/lib/catalogLocal.ts
import categoryAssets from "@/data/categoryAssets.json";
import subcategoryAssets from "@/data/subcategoryAssets.json";

const CF_ACCOUNT = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH || "";
const CF_BASE = process.env.NEXT_PUBLIC_IMAGE_DELIVERY_BASE || "https://imagedelivery.net";
const CF_VARIANT = process.env.NEXT_PUBLIC_CF_IMAGE_VARIANT || "public";

function cfUrl(imageId?: string, variant?: string, fallback?: string) {
  if (imageId && CF_ACCOUNT) {
    return `${CF_BASE}/${CF_ACCOUNT}/${imageId}/${variant || CF_VARIANT}`;
  }
  return fallback; // falls back to any existing imageUrl in JSON
}

export type Category = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  image?: string;       // now a Cloudflare URL if imageId is present
  imageId?: string;
  variant?: string;
};

export type Subcategory = {
  id: string | number;
  slug: string;
  name: string;
  categoryId: string;
  description?: string;
  image?: string | null;
  cloudflare_image_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

function titleize(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getLocalCategories(): Category[] {
  const map = categoryAssets as Record<string, any>;
  return Object.entries(map).map(([slug, data]) => {
    const img = cfUrl(data?.imageId, data?.variant, data?.imageUrl);
    return {
      id: slug,
      slug,
      name: titleize(slug),
      description: data?.description ?? "",
      image: img,                // ✅ Cloudflare URL if possible
      imageId: data?.imageId ?? undefined,
      variant: data?.variant ?? undefined,
    };
  });
}

export function getLocalCategoryBySlug(slug: string): Category | null {
  const map = categoryAssets as Record<string, any>;
  const data = map[slug];
  if (!data) return null;
  const img = cfUrl(data?.imageId, data?.variant, data?.imageUrl);
  return {
    id: slug,
    slug,
    name: titleize(slug),
    description: data?.description ?? "",
    image: img,                  // ✅ Cloudflare URL if possible
    imageId: data?.imageId ?? undefined,
    variant: data?.variant ?? undefined,
  };
}

export function getLocalSubcategories(categorySlug?: string): Subcategory[] {
  const rows = (subcategoryAssets as any[]) ?? [];
  const list: Subcategory[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    categoryId: r.category_id,
    description: r.description ?? "",
    image: null,
    cloudflare_image_id: r.cloudflare_image_id ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
  return categorySlug ? list.filter((s) => s.categoryId === categorySlug) : list;
}

export function getLocalSubcategoryBySlug(slug: string): Subcategory | null {
  const rows = getLocalSubcategories();
  return rows.find((s) => s.slug === slug) ?? null;
}
