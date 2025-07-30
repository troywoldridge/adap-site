// src/lib/queries/pricing.ts

import { db } from '@/lib/db';
import { pricing } from '@/drizzle/migrations/schema';
import { eq, inArray, and } from 'drizzle-orm';

import type { PricingRow } from '@/types/db';

// ✅ Stable hash generation from sorted option IDs
export function generatePricingHash(optionIds: number[]): string {
  return optionIds.slice().sort((a, b) => a - b).join('-');
}

// ✅ DB query to get matching pricing rows
export async function getPricingRows(productId: number, hashes: string[]): Promise<PricingRow[]> {
  const rows = await db
    .select()
    .from(pricing)
    .where(
      and(
        eq(pricing.product, productId),
        inArray(pricing.hash, hashes)
      )
    );

  return rows.map((row) => ({
  ...row,
  numericValue: row.numericValue !== null ? Number(row.numericValue) : null,
  width: row.width !== null ? Number(row.width) : undefined,
  height: row.height !== null ? Number(row.height) : undefined,
  depth: row.depth !== null ? Number(row.depth) : undefined,
  rawDimensions: row.rawDimensions !== null ? row.rawDimensions : undefined
}));

}



// ✅ Core price calculator
export async function calculatePrice(
  productId: number,
  selectedOptionIds: number[]
): Promise<{ price: number; details: PricingRow[] }> {
  if (selectedOptionIds.length !== 6) {
    throw new Error('Exactly 6 options are required for pricing.');
  }

  const hash = generatePricingHash(selectedOptionIds);
  const rows = await getPricingRows(productId, [hash]);

  if (rows.length === 0) {
    throw new Error(`No pricing found for hash: ${hash}`);
  }

  const price = rows.reduce((total, row) => {
    const value = Number(row.numericValue ?? row.value ?? 0); // flexible fallback
    return total + value;
  }, 0);

  return {
    price,
    details: rows
  };
}
