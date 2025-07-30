import { db } from '@/lib/db';
import { pricing } from '@/drizzle/migrations/schema';
import { generatePricingHash } from '@/lib/queries/pricing'; // Or wherever it's located

export async function calculatePrice(productId: number, selectedOptionIds: number[]) {
  const keyHash = generatePricingHash(selectedOptionIds);

  const result = await db.query.pricing.findFirst({
    where: (p, { eq, and }) =>
      and(eq(p.hash, keyHash), eq(p.product, productId))
  });

  if (!result) {
    throw new Error('No price found for selected options');
  }

  return {
    price: parseFloat(result.value || '0'),
    metadata: result.type ?? null // Or remove if you don't want/need this
  };
}
