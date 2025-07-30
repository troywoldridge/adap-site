import { db } from '@/lib/db';
import { categories } from '@/drizzle/migrations/schema';
import { eq } from 'drizzle-orm';
import { Category } from '@/types/db';

// ✅ Get all categories
export const getAllCategories = async (): Promise<Category[]> => {
  const results = await db.select().from(categories);
  return results.map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description ?? '',
    hidden: cat.hidden ?? false,
    sortOrder: cat.sortOrder ?? null,
    createdAt: cat.createdAt ? new Date(cat.createdAt) : new Date(),
  }));
};

// ✅ Get a single category by ID
export async function getCategoryById(id: string): Promise<Category | null> {
  const results = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (results.length === 0) {
    return null;
  }

  const cat = results[0];
  return {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description ?? '',
    hidden: cat.hidden ?? false,
    sortOrder: cat.sortOrder ?? null,
    createdAt: cat.createdAt ? new Date(cat.createdAt) : new Date(),
  };
}


