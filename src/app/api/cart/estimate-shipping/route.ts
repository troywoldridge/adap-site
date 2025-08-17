// src/hooks/useShippingEstimate.ts
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
  return Number.isFinite(x) ? Number(x) : 0;
}

async function fetchCurrentCartLines(): Promise<EstimateLine[]> {
  const res = await fetch('/api/cart/current', { method: 'GET', cache: 'no-store' });
  const data = await res.json();
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'Failed to load cart');
  }
  const lines = Array.isArray(data?.lines) ? data.lines : [];
  return lines.map((l: any) => ({
    productId: Number(l.productId),
    optionIds: Array.isArray(l.optionIds) ? l.optionIds.map((n: any) => Number(n)) : [],
    quantity: Number(l.quantity) || 1,
  }));
}

/** 🔹 Named export so `{ estimate }` works everywhere */
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
  const data: ServerResponse = await res.json();
  if (!res.ok || !('ok' in data) || !data.ok) {
    throw new Error(('error' in data && data.error) || 'Failed to get rates');
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

/** Hook wrapper that uses the same endpoint */
export function useCartShippingEstimate() {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRates = useCallback(async (input: EstimateInput) => {
    try {
      setLoading(true);
      setError(null);
      setRates([]);
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

/** Compat aliases */
export const useShippingEstimate = useCartShippingEstimate;
export default useCartShippingEstimate;
