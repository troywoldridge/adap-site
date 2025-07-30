import { db } from '@/lib/db';
import { subcategories } from '@/drizzle/migrations/schema';
import { eq } from 'drizzle-orm';
import { Subcategory } from '@/types/db';

export const getSubcategoriesByCategoryId = async (
  categoryId: number
): Promise<Subcategory[]> => {
  return await db.select().from(subcategories).where(eq(subcategories.categoryId, categoryId));
};

export const getSubcategoryById = async (id: number): Promise<Subcategory | undefined> => {
  const result = await db.select().from(subcategories).where(eq(subcategories.id, id)).limit(1);
  return result[0];
};
