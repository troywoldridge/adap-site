// src/components/CartShippingEstimator.tsx
'use client';

import { useState } from 'react';
import { useCartShippingEstimate, type EstimateLine } from '@/hooks/useShippingEstimate';

export default function CartShippingEstimator({
  lines,
  defaultCountry = 'US',
  defaultState = 'KY',
  defaultZip = '41179',
}: {
  lines?: EstimateLine[];
  defaultCountry?: 'US' | 'CA';
  defaultState?: string;
  defaultZip?: string;
}) {
  const { getRates, rates, error, loading } = useCartShippingEstimate();

  const [country, setCountry] = useState<'US' | 'CA'>(defaultCountry);
  const [state, setState] = useState(defaultState);
  const [zip, setZip] = useState(defaultZip);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await getRates({
      shipCountry: country,
      shipState: state,
      shipZip: zip,
      items: lines, // if undefined, hook will auto-read from /api/cart/current
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
        >
          <option value="US">United States</option>
          <option value="CA">Canada</option>
        </select>
        <input className="border rounded p-2" placeholder="State/Province" value={state} onChange={(e) => setState(e.target.value)} />
        <input className="border rounded p-2" placeholder="Postal code" value={zip} onChange={(e) => setZip(e.target.value)} />
        <button type="submit" className="rounded bg-black text-white px-4 py-2 disabled:opacity-50" disabled={loading}>
          {loading ? 'Getting rates…' : 'Get rates'}
        </button>
      </form>

      {error && <div className="text-sm text-red-600 whitespace-pre-wrap">{error}</div>}

      {!!rates?.length && (
        <ul className="divide-y rounded border">
          {rates.map((r, idx) => (
            <li key={`${r.serviceCode}-${idx}`} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {r.serviceName}{r.carrier ? ` · ${r.carrier}` : ''}
                </div>
                {r.eta && <div className="text-xs text-gray-500">ETA: {r.eta}</div>}
              </div>
              <div className="font-semibold">
                {r.currency} {r.amount.toFixed(2)}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && (!rates || rates.length === 0) && (
        <p className="text-sm text-gray-500">Enter your destination to see available shipping rates.</p>
      )}
    </div>
  );
}
