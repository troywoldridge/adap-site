"use client";

import { useEffect, useMemo, useState } from "react";

export type CartLineMini = { productId: number; optionIds: number[]; quantity: number };

export type ShippingRate = {
  carrier: string;
  method: string;
  cost: number;
  days: number | null;
  currency: "USD" | "CAD";
};

type Props = {
  lines: CartLineMini[];
  store: "US" | "CA";
  selected?: ShippingRate | null;
  onSelect?: (rate: ShippingRate | null) => void;
};

const fmtMoney = (v: number, c: "USD" | "CAD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(v || 0);

function toCurrency(c: unknown): "USD" | "CAD" {
  return c === "CAD" ? "CAD" : "USD";
}

export default function CartShippingEstimator({ lines, store, selected, onSelect }: Props) {
  const [shipCountry, setShipCountry] = useState<"US" | "CA">(store === "CA" ? "CA" : "US");
  const [shipState, setShipState] = useState("");
  const [shipZip, setShipZip] = useState("");
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [cheapestKey, setCheapestKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency: "USD" | "CAD" = shipCountry === "CA" ? "CAD" : "USD";

  useEffect(() => {
    if (!selected) {
      setSelectedKey(null);
      return;
    }
    const k = `${selected.carrier}__${selected.method}__${selected.cost}`;
    setSelectedKey(k);
  }, [selected]);

  const requestBody = useMemo(
    () => ({
      shipCountry,
      shipState,
      shipZip,
      items: lines.map((l) => ({
        productId: l.productId,
        optionIds: l.optionIds,
        quantity: l.quantity,
      })),
      store: shipCountry,
    }),
    [shipCountry, shipState, shipZip, lines]
  );

  async function handleGetRates() {
    setError(null);
    setRates([]);
    if (!shipCountry || !shipState || !shipZip) {
      setError("Please enter country, state/province and postal/zip.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/cart/estimate-shipping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const json = (await res.json()) as
        | { ok: true; rates: any[] }
        | { ok: false; error: string };

      if (!res.ok || !("ok" in json) || !json.ok) {
        setError((json as any)?.error || `Failed to get rates (${res.status})`);
        setLoading(false);
        return;
      }

      // ⬇⬇⬇ EXPLICITLY typed as ShippingRate[] (currency narrowed)
      const normalized: ShippingRate[] = (json.rates || []).map((r: any): ShippingRate => ({
        carrier: String(r?.carrier ?? ""),
        method: String(r?.method ?? ""),
        cost: Number(r?.cost ?? 0) || 0,
        days: typeof r?.days === "number" ? r.days : null,
        currency: toCurrency(r?.currency),
      }));

      normalized.sort((a, b) => a.cost - b.cost);
      setRates(normalized);

      const cheapest = normalized[0] || null;
      const cKey = cheapest ? `${cheapest.carrier}__${cheapest.method}__${cheapest.cost}` : null;
      setCheapestKey(cKey);

      const keepKey = selected
        ? `${selected.carrier}__${selected.method}__${selected.cost}`
        : null;
      const hasKeep =
        !!keepKey && normalized.some((r) => `${r.carrier}__${r.method}__${r.cost}` === keepKey);

      if (hasKeep) {
        setSelectedKey(keepKey!);
      } else if (cheapest && cKey) {
        setSelectedKey(cKey);
        onSelect?.(cheapest);
      } else {
        setSelectedKey(null);
        onSelect?.(null);
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  function choose(rate: ShippingRate) {
    const k = `${rate.carrier}__${rate.method}__${rate.cost}`;
    setSelectedKey(k);
    onSelect?.(rate);
    try {
      const key = `ADAP_SHIP_${shipCountry}_${shipState}_${shipZip}`;
      localStorage.setItem(key, JSON.stringify(rate));
    } catch {}
  }

  return (
    <div className="shipping-estimator">
      <div className="shipping-estimator__form" role="group" aria-label="Estimate shipping">
        <select
          value={shipCountry}
          onChange={(e) => setShipCountry(e.target.value as "US" | "CA")}
          aria-label="Country"
        >
          <option value="US">United States</option>
          <option value="CA">Canada</option>
        </select>

        <input
          value={shipState}
          onChange={(e) => setShipState(e.target.value.toUpperCase())}
          placeholder={shipCountry === "CA" ? "ON" : "KY"}
          aria-label="State/Province"
        />

        <input
          value={shipZip}
          onChange={(e) => setShipZip(e.target.value)}
          placeholder={shipCountry === "CA" ? "L3R 1G3" : "41179"}
          aria-label="Postal/ZIP"
        />

        {/* Matches Checkout button styling via globals */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGetRates}
          className="shipping-estimator__button btn checkout"
          aria-busy={loading ? "true" : "false"}
        >
          {loading ? "Loading…" : "Get Rates"}
        </button>
      </div>

      {error ? (
        <p className="shipping-estimator__error" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}

      {rates.length > 0 && (
        <ul className="shipping-rates" role="list">
          {rates.map((r) => {
            const k = `${r.carrier}__${r.method}__${r.cost}`;
            const checked = k === selectedKey;
            const cheapest = k === cheapestKey;
            return (
              <li
                key={k}
                onClick={() => choose(r)}
                className={`shipping-rate${checked ? " shipping-rate--selected" : ""}`}
                role="button"
                aria-pressed={checked}
              >
                <input
                  type="radio"
                  name="shipping-rate"
                  checked={checked}
                  onChange={() => choose(r)}
                />
                <div>
                  <div className="shipping-rate__name">
                    {r.carrier} — {r.method}
                    {cheapest ? <span className="shipping-rate__badge">Best price</span> : null}
                  </div>
                  <div className="shipping-rate__meta">
                    {typeof r.days === "number"
                      ? `${r.days} business day${r.days === 1 ? "" : "s"}`
                      : "—"}
                  </div>
                </div>
                <div className="shipping-rate__price">{fmtMoney(r.cost, r.currency)}</div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
