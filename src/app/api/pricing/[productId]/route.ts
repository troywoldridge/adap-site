import { NextRequest, NextResponse } from 'next/server';
import { calculatePrice } from '@/lib/utils/calculatePrice';

export async function POST(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { selectedOptions } = await req.json();

    // Validate: must be an array of 6 numeric IDs
    if (
      !Array.isArray(selectedOptions) ||
      selectedOptions.length !== 6 ||
      !selectedOptions.every((id) => typeof id === 'number')
    ) {
      return NextResponse.json(
        { error: 'Exactly 6 numeric options are required' },
        { status: 400 }
      );
    }

    const priceData = await calculatePrice(params.productId, selectedOptions);

    return NextResponse.json(priceData, { status: 200 });
  } catch (err) {
    console.error('❌ Pricing API error:', err);
    return NextResponse.json({ error: 'Pricing failed' }, { status: 500 });
  }
}
