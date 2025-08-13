// src/components/product/ShippingEstimator.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Rate = { carrier: string; method: string; price: number; days: number };

type Props = {
  productId: number;
  selectedOptionsByGroup?: Record<string, string | number> | null;
  enableEventBridge?: boolean;
  defaultCountry?: "US" | "CA";
};

export default function ShippingEstimator({
  productId,
  selectedOptionsByGroup = null,
  enableEventBridge = false,
  defaultCountry = "US",
}: Props) {
  const [country, setCountry] = useState<"US" | "CA">(defaultCountry);
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<Rate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [eventOptions, setEventOptions] = useState<Record<string, string | number> | null>(null);

  // Event bridge fallback if no props provided
  useEffect(() => {
    if (!enableEventBridge) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail === "object") {
        setEventOptions(detail as Record<string, string | number>);
      }
    };
    window.addEventListener("sinalite:selectedOptions", handler as EventListener);
    return () => window.removeEventListener("sinalite:selectedOptions", handler as EventListener);
  }, [enableEventBridge]);

  const effectiveOptions = useMemo(
    () => selectedOptionsByGroup || eventOptions,
    [selectedOptionsByGroup, eventOptions]
  );

  const canQuote = useMemo(() => {
    return !!effectiveOptions && !!state && !!zip && country?.length === 2;
  }, [effectiveOptions, state, zip, country]);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRates([]);
    try {
      const res = await fetch(`/api/products/${productId}/shipping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionIdsByGroup: effectiveOptions,
          shipping: { country, state, zip },
        }),
      });

      // Tolerate HTML error pages; prefer JSON
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        // Non-JSON (e.g., <!DOCTYPE ...>) — bubble up a clean error snippet
        const snippet = text?.slice(0, 240) || "Non-JSON response (server error).";
        throw new Error(snippet);
      }

      if (!res.ok) {
        throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
      }

      setRates(Array.isArray(data.rates) ? data.rates : []);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [productId, effectiveOptions, country, state, zip]);

  return (
    <div className="ui-card" aria-live="polite">
      <h3 className="section-title">Estimate Shipping</h3>

      {!effectiveOptions && (
        <p className="muted" style={{ marginTop: 4 }}>
          Select product options to get an accurate shipping estimate.
        </p>
      )}

      <div className="form-row" style={{ marginTop: 8 }}>
        <select
          className="input"
          value={country}
          onChange={(e) => setCountry(e.target.value as "US" | "CA")}
        >
          <option value="US">United States</option>
          <option value="CA">Canada</option>
        </select>

        <input
          className="input"
          placeholder={country === "US" ? "State (e.g. NY)" : "Prov. (e.g. ON)"}
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase())}
          autoComplete="address-level1"
        />

        <input
          className="input"
          placeholder={country === "US" ? "ZIP (e.g. 10001)" : "Postal (e.g. M5V 2T6)"}
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          autoComplete="postal-code"
        />
      </div>

      <button
        onClick={fetchRates}
        disabled={loading || !canQuote}
        className="btn btn-primary"
        style={{ marginTop: 8 }}
      >
        {loading ? "Getting rates..." : "Get rates"}
      </button>

      {error && <p className="muted" style={{ color: "#991b1b", marginTop: 8 }}>{error}</p>}

      {rates.length > 0 && (
        <ul className="ui-card" style={{ padding: 0, marginTop: 12 }}>
          {rates.map((r, i) => (
            <li
              key={`${r.carrier}-${r.method}-${i}`}
              style={{
                listStyle: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
                borderTop: i === 0 ? "none" : "1px solid var(--ui-border)",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{r.carrier}</div>
                <div className="muted" style={{ fontSize: 12 }}>{r.method}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700 }}>${r.price.toFixed(2)}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {r.days} business day{r.days === 1 ? "" : "s"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
