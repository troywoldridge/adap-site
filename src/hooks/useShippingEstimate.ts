'use client';

import { useState } from 'react';
import type { CartLine } from '@/lib/cart';
import { toSinaItems } from '@/lib/cart';

export function useCartShippingEstimate() {
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<
    Array<{ serviceCode: string; serviceName: string; carrier?: string; amount: number; currency: string; eta?: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  async function estimate(input: {
    shipCountry: 'US' | 'CA';
    shipState: string;
    shipZip: string;
    lines?: CartLine[]; // optional: if you don’t have a global cart hook
  }) {
    setLoading(true);
    setError(null);
    setRates([]);

    const items = toSinaItems(input.lines || []);
    if (items.length === 0) {
      setLoading(false);
      setError('Your cart is empty or missing option selections.');
      return;
    }

    const resp = await fetch('/api/shipping/estimate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shipCountry: input.shipCountry,
        shipState: input.shipState.trim(),
        shipZip: input.shipZip.trim(),
        items,
      }),
    });

    let data: any = null;
    try {
      data = await resp.json();
    } catch (e) {
      const text = await resp.text();
      setError(`Non-JSON response: ${text.slice(0, 200)}`);
      setLoading(false);
      return;
    }

    if (!resp.ok || !data?.ok) {
      setError(data?.error || `HTTP ${resp.status}`);
      setLoading(false);
      return;
    }

    setRates(data.rates || []);
    setLoading(false);
  }

  return { loading, rates, error, estimate };
}
