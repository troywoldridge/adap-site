// src/lib/queries/options.ts

import { db, options } from '@/lib/db';
import { eq } from 'drizzle-orm';
import type { Option } from '@/types/db';

/**
 * Fetches all options for a given product ID.
 * @param productId - The product ID as a string (will be parsed to number).
 * @returns Promise resolving to an array of Option objects.
 */
export async function getProductOptions(productId: string): Promise<Option[]> {
  // Parse productId to number; throws if invalid
  const prodIdNum = Number(productId);
  if (isNaN(prodIdNum)) {
    throw new Error('Invalid productId');
  }

  // Query options table for the product options
  return await db
      .select()
      .from(options)
      .where(eq(options.productId, prodIdNum));
}
