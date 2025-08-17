// src/hooks/useShippingEstimate.ts
'use client';

import { useCallback, useState } from 'react';

export type EstimateLine = {
  productId: number;
  optionIds: number[];   // Sinalite qty is an OPTION, not this numeric quantity field
  quantity?: number;     // optional & ignored by the shipping API (kept for cart convenience)
};

export type EstimateInput = {
  shipCountry: 'US' | 'CA';
  shipState: string;
  shipZip: string;
  items?: EstimateLine[]; // optional: if not provided, we’ll fetch from /api/cart/current
};

export type ShippingRate = {
  serviceCode: string;
  serviceName: string;
  carrier?: string;
  amount: number;
  currency: string;
  eta?: string | null;
};

type ServerRate = {
  carrier: string;
  method: string;
  price: number | string;
  days?: string | number;
};

type ServerResponse =
  | { ok: true; rates: ServerRate[] }
  | { ok: false; error: string };

// --- helpers ---

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

function currencyForCountry(country: 'US' | 'CA'): 'USD' | 'CAD' {
  return country === 'US' ? 'USD' : 'CAD';
}

function toNumber(n: unknown): number {
  const x = typeof n === 'string' ? parseFloat(n) : (n as number);
  return Number.isFinite(x) ? Number(x) : 0;
}

// --- hook ---

export function useCartShippingEstimate() {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRates = useCallback(async (input: EstimateInput) => {
    setLoading(true);
    setError(null);
    setRates([]);

    try {
      const items = input.items && input.items.length > 0
        ? input.items
        : await fetchCurrentCartLines();

      if (!items.length) {
        throw new Error('Your cart is empty.');
      }

      // Our server route expects `lines: { productId, optionIds }[]`
      const lines = items.map(i => ({
        productId: i.productId,
        optionIds: i.optionIds,
      }));

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

      // Map server rates -> UI ShippingRate shape
      const curr = currencyForCountry(input.shipCountry);
      const mapped: ShippingRate[] = (data.rates || []).map((r) => ({
        serviceCode: `${r.carrier}:${r.method}`,
        serviceName: r.method,
        carrier: r.carrier,
        amount: toNumber(r.price),
        currency: curr,
        eta: typeof r.days === 'number' || typeof r.days === 'string'
          ? String(r.days)
          : null,
      }));

      setRates(mapped);
      setLoading(false);
      return mapped;
    } catch (e: any) {
      setError(e?.message || 'Failed to get rates');
      setLoading(false);
      return [];
    }
  }, []);

  return { getRates, rates, loading, error };
}

// Compatibility alias for older imports
export const useShippingEstimate = useCartShippingEstimate;
export default useCartShippingEstimate;
