import { db } from '@/lib/db';
import { products } from '@/drizzle/migrations/schema';
import { eq } from 'drizzle-orm';
import { Product } from '@/types/db';

export const getProductsBySubcategory = async (
  subcategoryId: number
): Promise<Product[]> => {
  return await db.select().from(products).where(eq(products.subcategoryId, subcategoryId));
};

export const getProductBySku = async (sku: string): Promise<Product | undefined> => {
  const result = await db.select().from(products).where(eq(products.sku, sku)).limit(1);
  return result[0];
};
