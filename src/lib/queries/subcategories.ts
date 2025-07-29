// src/lib/queries/subcategories.ts

import { db, subcategories } from '@/lib/db';
import { eq } from 'drizzle-orm';
import type { Subcategory } from '@/types/db';

export const getSubcategoriesByCategoryId = async (categoryId: string): Promise<Subcategory[]> => {
  return await db.select().from(subcategories).where(eq(subcategories.categoryId, categoryId));
};

export const getSubcategoryById = async (id: number): Promise<Subcategory | undefined> => {
  const result = await db.select().from(subcategories).where(eq(subcategories.id, id)).limit(1);
  return result[0];
};
