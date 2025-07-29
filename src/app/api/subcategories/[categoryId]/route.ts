import { NextResponse } from 'next/server';
import { getSubcategoriesByCategoryId } from '@/lib/queries/subcategories';

export async function GET(
  request: Request,
  { params }: { params: { categoryId: string } }
) {
  const { categoryId } = params;

  if (!categoryId) {
    return NextResponse.json({ error: 'categoryId is required' }, { status: 400 });
  }

  try {
    const subcategories = await getSubcategoriesByCategoryId(categoryId);
    return NextResponse.json(subcategories);
  } catch (error) {
    console.error('Failed to fetch subcategories:', error);
    return NextResponse.json({ error: 'Failed to fetch subcategories' }, { status: 500 });
  }
}
