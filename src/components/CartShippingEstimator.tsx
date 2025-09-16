// src/components/CartShippingEstimator.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { saveShipChoice, flushShipChoiceToCart, type ShippingChoice } from "@/lib/shippingChoice";

/** Minimal cart line payload for estimating shipping (per SinaLite docs). */
type MiniLine = { productId: number; optionIds: number[]; quantity?: number };

type Props = {
  initialCountry: "US" | "CA";
  initialState?: string;
  initialZip?: string;
  /** Lines to estimate; MUST include optionIds for correct packaging via SinaLite. */
  lines?: MiniLine[];
  /** Display currency only; server derives real currency from country. */
  currency?: "USD" | "CAD";
};

export type ShippingRate = {
  carrier: string;
  serviceCode: string;
  serviceName: string;
  amount: number;
  currency: "USD" | "CAD";
  eta?: string | null;
  days?: number | null;
};

export default function CartShippingEstimator({
  initialCountry,
  initialState = "",
  initialZip = "",
  lines: linesProp,
  currency,
}: Props) {
  const [country, setCountry] = useState<"US" | "CA">(initialCountry);
  const [state, setState] = useState(initialState);
  const [zip, setZip] = useState(initialZip);

  // null = not fetched yet; [] = fetched, no rates; [..] = rates found
  const [rates, setRates] = useState<ShippingRate[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lines = Array.isArray(linesProp) ? linesProp : [];

  const disabled = useMemo(() => {
    const needState = !state.trim();
    const needZip = !zip.trim();
    return !country || needState || needZip || lines.length === 0;
  }, [country, state, zip, lines.length]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || (country === "CA" ? "CAD" : "USD"),
    }).format(Number(n) || 0);

  // Request live rates from our server route which calls SinaLite /order/shippingEstimate
  const onEstimate = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const normState = state.trim().toUpperCase();
      const rawZip = zip.trim();
      const normZip =
        country === "US"
          ? rawZip.replace(/[^0-9]/g, "").slice(0, 5) // 5-digit ZIP
          : rawZip.toUpperCase().replace(/\s+/g, "").replace(/^(.{3})(.{3,})$/, "$1 $2"); // A1A 1A1

      const payload = {
        country,
        state: normState,
        zip: normZip,
        lines: lines.map((l) => ({
          productId: l.productId,
          optionIds: Array.isArray(l.optionIds) ? l.optionIds : [],
          quantity: l.quantity ?? 1,
          debug: process.env.NODE_ENV !== "production"
        })),
      };

      const res = await fetch("/api/cart/shipping/estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const json = (await res.json()) as { ok: boolean; rates?: ShippingRate[]; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || `Estimate failed (${res.status})`);
      setRates(Array.isArray(json.rates) ? json.rates : []);
    } catch (e: any) {
      setError(e?.message || "Could not estimate shipping");
      setRates(null);
    } finally {
      setBusy(false);
    }
  }, [country, state, zip, lines]);

  // User picks a returned rate — persist to cart
  const onChoose = useCallback(
    async (r: ShippingRate) => {
      const choice: ShippingChoice = {
        country,
        state,
        zip,
        carrier: r.carrier,
        method: r.serviceName, // review page expects "method"
        cost: r.amount,
        days: r.days ?? null,
        currency: r.currency,
      };
      saveShipChoice(choice);
      await fetch("/api/cart/shipping/choose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(choice),
      });
      await flushShipChoiceToCart();
      window.location.reload();
    },
    [country, state, zip],
  );

  // Let users continue without a live rate (manual quote flow)
  const onSkipForNow = useCallback(async () => {
    const choice: ShippingChoice = {
      country,
      state,
      zip,
      carrier: "TBD",
      method: "Manual quote (no live rate)",
      cost: 0,
      days: null,
      currency: country === "CA" ? "CAD" : "USD",
    };
    saveShipChoice(choice);
    await fetch("/api/cart/shipping/choose", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(choice),
    });
    await flushShipChoiceToCart();
    window.location.reload();
  }, [country, state, zip]);

  // Auto-estimate once enough info is present
  useEffect(() => {
    if (zip && state && lines.length > 0) onEstimate();
  }, [zip, state, lines.length, onEstimate]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Estimate shipping</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-gray-700">Country</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value === "CA" ? "CA" : "US")}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">
            {country === "US" ? "State" : "Province"}
          </label>
          <input
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
            placeholder={country === "US" ? "CA" : "ON"}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">
            {country === "US" ? "ZIP" : "Postal code"}
          </label>
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
            placeholder={country === "US" ? "94107" : "M5V 2T6"}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onEstimate}
          disabled={disabled || busy}
          className="inline-flex h-9 items-center rounded-md bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {busy ? "Estimating…" : "Get rates"}
        </button>
        {error ? <span className="text-sm text-rose-700">{error}</span> : null}
      </div>

      {/* Results */}
      {rates === null ? null : rates.length === 0 ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <div className="font-semibold text-amber-900">No live rates were returned.</div>
          <div className="mt-1 text-amber-900/90">
            This can happen for certain option combinations until SinaLite confirms packaging.
            You can retry, tweak the address, or continue without a live rate—we’ll confirm shipping before payment.
          </div>
          <ul className="mt-2 list-disc pl-4 text-amber-900/90">
            <li>Double-check State/Province and ZIP/Postal Code</li>
            <li>Try a nearby ZIP</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEstimate}
              className="inline-flex h-9 items-center rounded-md bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={onSkipForNow}
              className="inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Continue without shipping
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {rates.map((r, i) => (
            <div key={`${r.carrier}-${r.serviceCode}-${i}`} className="flex items-center justify-between rounded-lg border p-3">
              <div className="min-w-0">
                <div className="font-medium text-gray-900">
                  {r.carrier} — {r.serviceName}
                </div>
                <div className="text-xs text-gray-600">
                  {r.eta ? r.eta : r.days != null ? `${r.days} business day${r.days === 1 ? "" : "s"}` : "ETA TBA"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-semibold">{fmt(r.amount)}</div>
                <button
                  type="button"
                  onClick={() => onChoose(r)}
                  className="inline-flex h-8 items-center rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Choose
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
