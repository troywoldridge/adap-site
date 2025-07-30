import { NextResponse } from 'next/server';
import { getSubcategoriesByCategoryId } from '@/lib/queries/subcategories';

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: { categoryId?: string } }
) {
  const {categoryId} = params;

  if (!categoryId || categoryId.trim() === '') {
    return errorResponse('Missing or empty categoryId parameter', 400);
  }

  // Convert to number if your category IDs are numeric, otherwise skip this conversion
  const categoryIdNumber = Number(categoryId);
  if (isNaN(categoryIdNumber) || categoryIdNumber <= 0) {
    return errorResponse('Invalid categoryId parameter', 400);
  }

  try {
    const subcategories = await getSubcategoriesByCategoryId(categoryIdNumber);

    if (!subcategories || subcategories.length === 0) {
      return errorResponse('No subcategories found for this category', 404);
    }

    return NextResponse.json(subcategories, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch subcategories:', error);
    return errorResponse('Internal Server Error', 500);
  }
}
