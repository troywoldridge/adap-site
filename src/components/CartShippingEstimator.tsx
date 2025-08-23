"use client";

import { useEffect, useMemo, useState } from "react";

export type CartLineMini = {
  productId: number;
  optionIds: number[];
  quantity: number;
};

export type ShippingRate = {
  carrier: string;            // e.g. "UPS"
  method: string;             // e.g. "UPS Standard"
  cost: number;               // e.g. 31.53
  days: number | null;        // business days (if provided)
  currency: "USD" | "CAD";
};

type Props = {
  /** Lines from the cart */
  lines: CartLineMini[];
  /** "US" | "CA"; also determines default currency label */
  store: "US" | "CA";
  /** Preselected rate, if any (persisted from earlier) */
  selected?: ShippingRate | null;
  /** Bubble the selection up to parent */
  onSelect?: (rate: ShippingRate | null) => void;
};

function fmtMoney(v: number, currency: "USD" | "CAD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    v || 0
  );
}

export default function CartShippingEstimator({
  lines,
  store,
  selected,
  onSelect,
}: Props) {
  const [shipCountry, setShipCountry] = useState<"US" | "CA">(
    store === "CA" ? "CA" : "US"
  );
  const [shipState, setShipState] = useState("");
  const [shipZip, setShipZip] = useState("");
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency: "USD" | "CAD" = shipCountry === "CA" ? "CAD" : "USD";

  // Keep UI selection in sync when parent provides a selected rate
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
      store: shipCountry, // API expects "US" | "CA"
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
        | { ok: true; rates: ShippingRate[] }
        | { ok: false; error: string; detail?: unknown };

      if (!res.ok || !("ok" in json) || !json.ok) {
        const msg =
          (json as any)?.error || `Failed to get rates (${res.status})`;
        setError(msg);
        setLoading(false);
        return;
      }

      const normalized: ShippingRate[] = (json.rates || []).map((r) => ({
        carrier: r.carrier || "",
        method: r.method || "",
        cost: Number(r.cost) || 0,
        days: typeof r.days === "number" ? r.days : null,
        currency: r.currency === "CAD" ? "CAD" : "USD",
      }));

      // Sort by cost asc so the cheapest is on top
      normalized.sort((a, b) => a.cost - b.cost);

      setRates(normalized);

      // If we already had a selected rate and it's still in the list, keep it;
      // otherwise clear selection.
      const keepKey = selected
        ? `${selected.carrier}__${selected.method}__${selected.cost}`
        : null;
      const hasKeep =
        keepKey && normalized.some((r) => `${r.carrier}__${r.method}__${r.cost}` === keepKey);
      if (!hasKeep) {
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

    // Persist lightly so a hard refresh keeps the user’s choice (scoped by country/state/zip)
    try {
      const key = `ADAP_SHIP_${shipCountry}_${shipState}_${shipZip}`;
      localStorage.setItem(key, JSON.stringify(rate));
    } catch {}
  }

  return (
    <div>
      {/* Inputs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr auto",
          gap: 8,
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <select
          value={shipCountry}
          onChange={(e) => setShipCountry(e.target.value as "US" | "CA")}
          aria-label="Country"
          className="shipping-estimator__select"
        >
          <option value="US">United States</option>
          <option value="CA">Canada</option>
        </select>

        <input
          value={shipState}
          onChange={(e) => setShipState(e.target.value.toUpperCase())}
          placeholder={shipCountry === "CA" ? "ON" : "KY"}
          aria-label="State/Province"
          className="shipping-estimator__input"
        />

        <input
          value={shipZip}
          onChange={(e) => setShipZip(e.target.value)}
          placeholder={shipCountry === "CA" ? "L3R 1G3" : "41179"}
          aria-label="Postal/ZIP"
          className="shipping-estimator__input"
        />

        <button
          disabled={loading}
          onClick={handleGetRates}
          className="shipping-estimator__button"
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "var(--color-blue)",
            color: "#fff",
            fontWeight: 700,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Loading…" : "Get Rates"}
        </button>
      </div>

      {error ? (
        <p style={{ color: "#b91c1c", margin: "6px 0 10px" }}>{error}</p>
      ) : null}

      {/* Rates */}
      {rates.length > 0 && (
        <ul
          style={{
            marginTop: 8,
            padding: 0,
            listStyle: "none",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {rates.map((r, i) => {
            const k = `${r.carrier}__${r.method}__${r.cost}`;
            const checked = k === selectedKey;
            return (
              <li
                key={k}
                onClick={() => choose(r)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 12px",
                  borderTop: i ? "1px solid #f1f5f9" : "none",
                  cursor: "pointer",
                  background: checked ? "#f8fafc" : "#fff",
                }}
              >
                <input
                  type="radio"
                  name="shipping-rate"
                  checked={checked}
                  onChange={() => choose(r)}
                  style={{ margin: 0 }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {r.carrier} — {r.method}
                  </div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>
                    {typeof r.days === "number"
                      ? `${r.days} business day${r.days === 1 ? "" : "s"}`
                      : "—"}
                  </div>
                </div>
                <div style={{ fontWeight: 700 }}>
                  {fmtMoney(r.cost, r.currency || currency)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
