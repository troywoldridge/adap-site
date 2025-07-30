import { NextResponse } from 'next/server';
import { getProductById } from '@/lib/queries/products';

export async function GET(_: Request, { params }: { params: { productId: string } }) {
  const { productId } = params;

  try {
    const product = await getProductById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (err) {
    console.error('Error fetching product:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
