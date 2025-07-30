// src/app/api/options/groups/[productId]/route.ts
import { NextResponse } from 'next/server';
import { getOptionGroupsByProductId } from '@/lib/queries/options';

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: { productId?: string } }
) {
  const productId = params.productId ? Number(params.productId) : NaN;

  if (!productId || isNaN(productId)) {
    return errorResponse('Valid productId is required', 400);
  }

  try {
    const groups = await getOptionGroupsByProductId(productId);

    if (!groups || groups.length === 0) {
      return errorResponse('No option groups found', 404);
    }

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Failed to fetch option groups:', error);
    return errorResponse('Internal Server Error', 500);
  }
}
