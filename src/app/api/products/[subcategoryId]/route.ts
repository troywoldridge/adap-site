import { NextResponse } from 'next/server';
import { getProductsBySubcategory } from '@/lib/queries/products';

export async function GET(
  request: Request,
  { params }: { params: { subcategoryId: string } }
) {
  const subcategoryId = Number(params.subcategoryId);

  if (!subcategoryId || isNaN(subcategoryId)) {
    return NextResponse.json({ error: 'Valid subcategoryId is required' }, { status: 400 });
  }

  try {
    const products = await getProductsBySubcategory(subcategoryId);
    return NextResponse.json(products);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
