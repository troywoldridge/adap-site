import type { MetadataRoute } from "next";
import categoryAssets from "@/data/categoryAssets.json";
import subcategoryAssets from "@/data/subcategoryAssets.json";
import productAssets from "@/data/productAssets.json";

/**
 * Builds a complete sitemap:
 *  - Home
 *  - Each top-level category (/category/:categorySlug)
 *  - Each subcategory (/category/:categorySlug/:subcategorySlug)
 *  - Each known product id from productAssets.json (/product/:id)
 *
 * Uses NEXT_PUBLIC_SITE_URL when set, falls back to your live domain.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const site =
    (process.env.NEXT_PUBLIC_SITE_URL || "https://americandesignandprinting.com").replace(
      /\/+$/,
      ""
    );

  const now = new Date();

  const out: MetadataRoute.Sitemap = [
    {
      url: `${site}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  // Categories (keys of categoryAssets.json)
  const catObj = categoryAssets as Record<string, unknown>;
  Object.keys(catObj).forEach((categorySlug) => {
    out.push({
      url: `${site}/category/${categorySlug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  });

  // Subcategories (array with category_id + slug)
  (subcategoryAssets as Array<{ category_id: string; slug: string }>).forEach(
    (s) => {
      if (!s?.category_id || !s?.slug) return;
      out.push({
        url: `${site}/category/${s.category_id}/${s.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  );

  // Products — unique ids from productAssets.json
  const productIds = new Set<number>();
  (productAssets as Array<{ product_id?: number; id?: number }>).forEach((p) => {
    const id = Number(p.product_id ?? p.id);
    if (id && id > 0) productIds.add(id);
  });

  productIds.forEach((id) => {
    out.push({
      url: `${site}/product/${id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  });

  return out;
}
