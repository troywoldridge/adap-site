// src/lib/queries/images.ts

import { db, images } from '@/lib/db';
import { eq } from 'drizzle-orm';
import type { Image, ProductImage } from '@/types/db';

export const getImagesByProductId = async (productId: number): Promise<Image[]> => {
  const raw = await db.select().from(images).where(eq(images.productId, productId));

  return raw.map((row) => ({
    id: row.id,
    productId: row.productId !== null ? String(row.productId) : null, // ✅ fix here
    categoryId: row.categoryId,
    subcategoryId: row.subcategoryId,
    type: 'product',
    url: row.imageUrl,
    alt: row.alt ?? null,
  }));
};

export const getImagesByCategoryId = async (categoryId: string): Promise<Image[]> => {
  const raw = await db.select().from(images).where(eq(images.categoryId, categoryId));

  return raw.map((row) => ({
    id: row.id,
    productId: row.productId !== null ? String(row.productId) : null, // ✅ again here
    categoryId: row.categoryId,
    subcategoryId: row.subcategoryId,
    type: 'category',
    url: row.imageUrl,
    alt: row.alt ?? null,
  }));
};


export function toProductImages(images: Partial<Image>[]): ProductImage[] {
  return images
    .filter((img): img is Image => typeof img.url === 'string') // filter out invalid ones
    .map((img) => ({
      id: String(img.id),
      url: img.url,
      alt: img.alt ?? null,
    }));
}
