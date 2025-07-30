// src/app/api/products/[subcategoryId]/route.ts

import { NextResponse } from 'next/server';
import { getProductsBySubcategory } from '@/lib/queries/products';

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: { subcategoryId?: string } }
) {
  const subcategoryIdRaw = params.subcategoryId;

  if (!subcategoryIdRaw) {
    return errorResponse('Missing subcategoryId parameter', 400);
  }

  const subcategoryId = Number(subcategoryIdRaw);

  if (isNaN(subcategoryId) || subcategoryId <= 0) {
    return errorResponse('Invalid subcategoryId parameter', 400);
  }

  try {
    const products = await getProductsBySubcategory(subcategoryId);

    if (!products || products.length === 0) {
      return errorResponse('No products found for this subcategory', 404);
    }

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return errorResponse('Internal Server Error', 500);
  }
}
