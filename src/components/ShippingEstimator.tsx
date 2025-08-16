'use client';

import { useMemo, useState } from 'react';
import {
  useCartShippingEstimate,
  type CartLine,
  type ShippingRate,
} from '@/hooks/useCartShippingEstimate';

type Props = {
  lines: CartLine[];
  defaultCountry?: 'US' | 'CA';
  defaultState?: string;
  defaultZip?: string;
};

export default function ShippingEstimator({
  lines,
  defaultCountry = 'US',
  defaultState = 'KY',
  defaultZip = '41179',
}: Props) {
  const { estimate, rates, error, loading } = useCartShippingEstimate();

  const [country, setCountry] = useState<'US' | 'CA'>(defaultCountry);
  const [state, setState] = useState<string>(defaultState);
  const [zip, setZip] = useState<string>(defaultZip);

  const itemsPresent = useMemo(() => {
    const cleaned = (lines || [])
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
    return cleaned.length > 0;
  }, [lines]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await estimate({
      shipCountry: country,
      shipState: state,
      shipZip: zip,
      lines,
    });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Estimate Shipping</h3>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value as 'US' | 'CA')}
          className="border rounded p-2"
          aria-label="Country"
        >
          <option value="US">United States</option>
          <option value="CA">Canada</option>
        </select>

        <input
          className="border rounded p-2"
          placeholder="State/Province"
          aria-label="State/Province"
          value={state}
          onChange={(e) => setState(e.target.value)}
        />
        <input
          className="border rounded p-2"
          placeholder="Postal code"
          aria-label="Postal code"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
        />

        <button
          type="submit"
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
          disabled={loading || !itemsPresent}
          title={!itemsPresent ? 'Add items to cart first' : 'Get rates'}
        >
          {loading ? 'Getting rates…' : 'Get rates'}
        </button>
      </form>

      {!itemsPresent && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          Add configured items to your cart to estimate shipping.
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 whitespace-pre-wrap">{error}</div>
      )}

      {!!rates?.length && (
        <ul className="divide-y rounded border">
          {rates.map((r: ShippingRate) => (
            <li
              key={`${r.serviceCode}-${r.amount}-${r.serviceName}`}
              className="p-3 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">
                  {r.serviceName}
                  {r.carrier ? ` · ${r.carrier}` : ''}
                </div>
                {r.eta && (
                  <div className="text-xs text-gray-500">ETA: {r.eta}</div>
                )}
              </div>
              <div className="font-semibold">
                {r.currency} {Number(r.amount).toFixed(2)}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && rates.length === 0 && itemsPresent && (
        <p className="text-sm text-gray-500">
          Enter your destination to see available shipping rates.
        </p>
      )}
    </div>
  );
}
