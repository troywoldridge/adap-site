// src/app/api/pricing/category/[category]/route.ts
import { NextResponse } from 'next/server';
import { getPricingByCategory } from '@/lib/queries/pricing';

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: { category?: string } }
) {
  const category = params.category;

  if (!category) {
    return errorResponse('Category parameter is required', 400);
  }

  try {
    const pricingData = await getPricingByCategory(category);

    if (!pricingData || pricingData.length === 0) {
      return errorResponse('No pricing found for this category', 404);
    }

    return NextResponse.json(pricingData);
  } catch (error) {
    console.error('Failed to fetch pricing:', error);
    return errorResponse('Internal Server Error', 500);
  }
}
