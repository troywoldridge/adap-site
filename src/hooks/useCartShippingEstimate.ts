'use client';

import { useState } from 'react';

export type CartLine = {
  productId: number | string;
  optionIds: Array<number | string>;
  quantity: number | string;
};

export type ShippingRate = {
  serviceCode: string;
  serviceName: string;
  carrier?: string;
  amount: number;
  currency: string;
  eta?: string;
};

type EstimateInput = {
  shipCountry: 'US' | 'CA';
  shipState: string;
  shipZip: string;
  lines?: CartLine[];
};

function toItems(lines: CartLine[] | undefined) {
  return (lines ?? [])
    .map((l) => ({
      productId: Number(l.productId),
      optionIds: (Array.isArray(l.optionIds) ? l.optionIds : [])
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n)),
      quantity: Math.max(1, Number(l.quantity || 1)),
    }))
    .filter(
      (i) =>
        Number.isFinite(i.productId) &&
        i.optionIds.length > 0 &&
        Number.isFinite(i.quantity)
    );
}

export function useCartShippingEstimate() {
  const [loading, setLoading] = useState<boolean>(false);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function estimate(input: EstimateInput): Promise<void> {
    setLoading(true);
    setError(null);
    setRates([]);

    const items = toItems(input.lines);
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

    let data: any;
    try {
      data = await resp.json();
    } catch {
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

    setRates((data.rates as ShippingRate[]) || []);
    setLoading(false);
  }

  return { loading, rates, error, estimate };
}
