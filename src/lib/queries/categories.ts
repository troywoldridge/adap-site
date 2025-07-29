// src/lib/queries/categories.ts

import { db, categories } from '@/lib/db';
import { eq } from 'drizzle-orm';
import type { Category } from '@/types/db';

export const getCategories = async (): Promise<Category[]> => {
  return await db.select().from(categories);
};

export const getCategoryById = async (id: string): Promise<Category | undefined> => {
  const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return result[0];
};
