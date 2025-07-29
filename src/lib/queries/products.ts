// src/lib/queries/products.ts

import { db, products } from '@/lib/db';
import { eq } from 'drizzle-orm';
import type { Product } from '@/types/db';

export const getProductsBySubcategory = async (subcategoryId: number): Promise<Product[]> => {
  return await db.select().from(products).where(eq(products.subcategoryId, subcategoryId));
};

export const getProductBySku = async (sku: string): Promise<Product | undefined> => {
  const result = await db.select().from(products).where(eq(products.sku, sku)).limit(1);
  return result[0];
};
