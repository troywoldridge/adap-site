// src/lib/queries/images.ts

import { db, images } from '@/lib/db';
import { eq } from 'drizzle-orm';
import type { Image } from '@/types/db';

export const getImagesByProductId = async (productId: number): Promise<Image[]> => {
  return await db.select().from(images).where(eq(images.productId, productId));
};

export const getImagesByCategoryId = async (categoryId: string): Promise<Image[]> => {
  return await db.select().from(images).where(eq(images.categoryId, categoryId));
};
