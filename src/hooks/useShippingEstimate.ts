// src/hooks/useShippingEstimate.ts
'use client';

import { useCallback, useState } from 'react';

export type EstimateLine = {
  productId: number;
  optionIds: number[];
  quantity: number;
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

type EstimateResponse =
  | { ok: true; rates: ShippingRate[] }
  | { ok: false; error: string };

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

      const res = await fetch('/api/shipping/estimate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          shipCountry: input.shipCountry,
          shipState: input.shipState.trim(),
          shipZip: input.shipZip.trim(),
          items,
        }),
      });

      const data: EstimateResponse = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(('error' in data && data.error) || 'Failed to get rates');
      }

      setRates(data.rates || []);
      setLoading(false);
      return data.rates || [];
    } catch (e: any) {
      setError(e?.message || 'Failed to get rates');
      setLoading(false);
      return [];
    }
  }, []);

  return { getRates, rates, loading, error };
}

// Export a compatibility alias so older imports still work
export const useShippingEstimate = useCartShippingEstimate;
export default useCartShippingEstimate;
