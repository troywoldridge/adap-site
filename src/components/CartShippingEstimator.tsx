"use client";

import { useState, useMemo } from "react";


// If you don't have a money helper yet, uncomment:
export function fmtCurrency(n: number, c: "USD" | "CAD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n);
}

export type EstimateLine = {
  productId: number;
  optionIds: number[];
  quantity?: number;
};

export type EstimateInput = {
  shipCountry: "US" | "CA";
  shipState: string;
  shipZip: string;
  items?: EstimateLine[];
};

export type ShippingRate = {
  serviceCode: string;
  serviceName: string;
  carrier?: string;
  amount: number;
  currency: "USD" | "CAD";
  eta?: string | null;
};

type Props = {
  lines: EstimateLine[];
};

/**
 * Calls your server route which, in turn, calls Sinalite’s shipping estimator.
 * Keep server-side logic aligned with the Sinalite API docs (storeCode 9 US / 6 CA).
 */
async function fetchRates(input: EstimateInput): Promise<ShippingRate[]> {
  const res = await fetch("/api/cart/estimate-shipping", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { ok: boolean; rates?: any[]; error?: string };
  if (!json.ok) {
    throw new Error(json.error || "Failed to get rates");
  }
  // Normalize to ShippingRate (your API already does this, but we’re defensive)
  return (json.rates || []).map((r) => ({
    serviceCode: String(r.serviceCode ?? r.method ?? ""),
    serviceName: String(r.serviceName ?? r.method ?? "Shipping"),
    carrier: r.carrier ? String(r.carrier) : undefined,
    amount: Number(r.amount ?? r.price ?? 0),
    currency: (r.currency ?? "USD") as "USD" | "CAD",
    eta: r.eta != null ? String(r.eta) : null,
  })) as ShippingRate[];
}

export default function CartShippingEstimator({ lines }: Props) {
  const [country, setCountry] = useState<"US" | "CA">("US");
  const [stateProv, setStateProv] = useState("");
  const [postal, setPostal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rates, setRates] = useState<ShippingRate[] | null>(null);

  const currency = country === "US" ? "USD" : "CAD";

  // Smart placeholders & simple client‑side constraints
  const stateLabel = country === "US" ? "State" : "Province";
  const zipLabel = country === "US" ? "ZIP code" : "Postal code";
  const zipPlaceholder = country === "US" ? "e.g., 10001" : "e.g., M5V 3L9";

  // Light validation (server still validates per Sinalite docs)
  const valid = useMemo(() => {
    const hasLines = Array.isArray(lines) && lines.length > 0;
    const sp = stateProv.trim().length >= 2; // “CA”, “ON”, etc.
    const z = postal.trim().length >= (country === "US" ? 5 : 3);
    return hasLines && sp && z;
  }, [lines, stateProv, postal, country]);

  async function onGetRates(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setRates(null);
    if (!valid) {
      setError("Please enter a state/province and a valid ZIP/Postal code.");
      return;
    }
    setBusy(true);
    try {
      const result = await fetchRates({
        shipCountry: country,
        shipState: stateProv.trim(),
        shipZip: postal.trim(),
        items: lines,
      });
      setRates(result);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch shipping rates.");
    } finally {
      setBusy(false);
    }
  }

  return (
    // in CartShippingEstimator.tsx
    <section id="cart-estimator-v2" className="estimator estimator--compact" aria-label="Estimate Shipping">

      <h4 className="estimator__title">Estimate Shipping</h4>

      <form className="estimator__form" onSubmit={onGetRates}>
        <div className="estimator__inputs">
          <label className="estimator__field">
            <span className="estimator__label">Country</span>
            <select
              className="estimator__control"
              value={country}
              onChange={(e) => setCountry(e.target.value as "US" | "CA")}
              aria-label="Ship to country"
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </label>

          <label className="estimator__field">
            <span className="estimator__label">{stateLabel}</span>
            <input
              className="estimator__control"
              type="text"
              value={stateProv}
              onChange={(e) => setStateProv(e.target.value.toUpperCase())}
              placeholder={country === "US" ? "NY" : "ON"}
              inputMode="text"
              autoCorrect="off"
              autoCapitalize="characters"
              aria-label={stateLabel}
              maxLength={32}
              required
            />
          </label>

          <label className="estimator__field">
            <span className="estimator__label">{zipLabel}</span>
            <input
              className="estimator__control"
              type="text"
              value={postal}
              onChange={(e) => setPostal(e.target.value.toUpperCase())}
              placeholder={zipPlaceholder}
              inputMode={country === "US" ? "numeric" : "text"}
              autoCorrect="off"
              autoCapitalize="characters"
              aria-label={zipLabel}
              maxLength={16}
              required
            />
          </label>

          <button
            type="submit"
            className="btn-primary estimator__cta"
            disabled={busy || !valid}
            aria-live="polite"
          >
            {busy ? "Getting rates…" : "Get rates"}
          </button>
        </div>
      </form>

      {error && <p role="alert" className="estimator__error">{error}</p>}

      {rates && (
        <ul className="estimator__rates" aria-live="polite">
          {rates.length === 0 && (
            <li className="estimator__rate estimator__rate--empty">
              No rates returned. Try another ZIP/Postal.
            </li>
          )}
          {rates.map((r) => (
            <li key={`${r.carrier}-${r.serviceCode}`} className="estimator__rate">
              <div className="estimator__rate-left">
                <strong className="estimator__rate-name">
                  {r.carrier ? `${r.carrier} ` : ""}{r.serviceName}
                </strong>
                {r.eta && <span className="estimator__rate-eta">ETA: {r.eta}</span>}
              </div>
              <div className="estimator__rate-right">
                {fmtCurrency(r.amount, r.currency)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
