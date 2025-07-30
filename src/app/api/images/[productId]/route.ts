// src/app/api/images/[productId]/route.ts

import { NextResponse } from 'next/server';
import { getImagesByProductId } from '@/lib/queries/images';

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: { productId?: string } }
) {
  const productIdRaw = params.productId;

  if (!productIdRaw) {
    return errorResponse('Missing productId parameter', 400);
  }

  const productId = Number(productIdRaw);

  if (isNaN(productId) || productId <= 0) {
    return errorResponse('Invalid productId parameter', 400);
  }

  try {
    const images = await getImagesByProductId(productId);

    if (!images || images.length === 0) {
      return errorResponse('No images found for this product', 404);
    }

    return NextResponse.json(images, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch images:', error);
    return errorResponse('Internal Server Error', 500);
  }
}
