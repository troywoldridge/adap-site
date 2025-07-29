import { NextResponse } from 'next/server';
import { getImagesByProductId } from '@/lib/queries/images';

export async function GET(
  request: Request,
  { params }: { params: { productId: string } }
) {
  const productId = Number(params.productId);

  if (!productId || isNaN(productId)) {
    return NextResponse.json({ error: 'Valid productId is required' }, { status: 400 });
  }

  try {
    const images = await getImagesByProductId(productId);
    return NextResponse.json(images);
  } catch (error) {
    console.error('Failed to fetch images:', error);
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}
