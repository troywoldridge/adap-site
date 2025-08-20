'use client';

import { useCallback, useState } from 'react';

export type EstimateLine = {
  productId: number;
  optionIds: number[];
  quantity?: number;
};

export type EstimateInput = {
  shipCountry: 'US' | 'CA';
  shipState: string;
  shipZip: string;
  items?: EstimateLine[];
};

export type ShippingRate = {
  serviceCode: string;
  serviceName: string;
  carrier?: string;
  amount: number;
  currency: string;
  eta?: string | null;
};

type ServerRate = { carrier: string; method: string; price: number | string; days?: string | number; };
type ServerResponse = { ok: true; rates: ServerRate[] } | { ok: false; error: string };

function currencyForCountry(country: 'US' | 'CA'): 'USD' | 'CAD' {
  return country === 'US' ? 'USD' : 'CAD';
}
function toNumber(n: unknown): number {
  const x = typeof n === 'string' ? parseFloat(n) : (n as number);
  return Number.isFinite(x) ? x : 0;
}

async function fetchCurrentCartLines(): Promise<EstimateLine[]> {
  const res = await fetch('/api/cart', { method: 'GET', cache: 'no-store' });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) {
    throw new Error('Failed to load cart.');
  }
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((it: any) => ({
    productId: Number(it.productId),
    optionIds: Array.isArray(it.optionIds) ? it.optionIds.map((n: any) => Number(n)) : [],
    quantity: Number(it.quantity) || 1,
  }));
}

async function parseJsonSafe(res: Response) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return await res.json();
  }
  const txt = await res.text().catch(() => '');
  return { ok: false, error: txt || `HTTP ${res.status}` };
}

export async function estimate(input: EstimateInput): Promise<ShippingRate[]> {
  const items = input.items && input.items.length > 0 ? input.items : await fetchCurrentCartLines();
  if (!items.length) {
    throw new Error('Your cart is empty.');
  }

  const lines = items.map(i => ({ productId: i.productId, optionIds: i.optionIds }));
  const res = await fetch('/api/cart/estimate-shipping', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      shipCountry: input.shipCountry,
      shipState: input.shipState.trim(),
      shipZip: input.shipZip.trim(),
      lines,
    }),
  });

  const data = await parseJsonSafe(res) as ServerResponse;
  if (!res.ok || !('ok' in data) || !data.ok) {
    throw new Error(('error' in data && data.error) || `Failed to get rates (HTTP ${res.status})`);
  }

  const curr = currencyForCountry(input.shipCountry);
  return (data.rates || []).map(r => ({
    serviceCode: `${r.carrier}:${r.method}`,
    serviceName: r.method,
    carrier: r.carrier,
    amount: toNumber(r.price),
    currency: curr,
    eta: typeof r.days === 'number' || typeof r.days === 'string' ? String(r.days) : null,
  }));
}

export function useCartShippingEstimate() {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRates = useCallback(async (input: EstimateInput) => {
    setLoading(true);
    setError(null);
    setRates([]);
    try {
      const r = await estimate(input);
      setRates(r);
      return r;
    } catch (e: any) {
      setError(e?.message || 'Failed to get rates');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { getRates, rates, loading, error };
}

export const useShippingEstimate = useCartShippingEstimate;
export default useCartShippingEstimate;
