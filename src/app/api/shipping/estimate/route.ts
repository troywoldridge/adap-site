import { NextRequest, NextResponse } from 'next/server';
import { fetchOrderShippingEstimate, normalizeRates } from '@/lib/sinalite.server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

function bad(msg: string, status=400) {
  return NextResponse.json({ ok:false, error: msg }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { shipCountry, shipState, shipZip, items } = body || {};

    if (!/^(US|CA)$/.test(shipCountry || '')) return bad('shipCountry must be "US" or "CA"');
    if (!shipState) return bad('shipState is required');
    if (!shipZip) return bad('shipZip is required');
    if (!Array.isArray(items) || items.length === 0) {
      return bad('items must be a non-empty array [{ productId, optionIds, quantity }]');
    }

    const raw = await fetchOrderShippingEstimate({ shipCountry, shipState, shipZip, items });
    const rates = normalizeRates(raw);
    return NextResponse.json({ ok: true, rates });
  } catch (e: any) {
    const msg = e?.name === 'AbortError'
      ? 'Upstream timeout (sandbox) — retry later or reduce cart size.'
      : e?.message || 'Unknown error';
    return NextResponse.json({ ok:false, error: msg }, { status: 500 });
  }
}
