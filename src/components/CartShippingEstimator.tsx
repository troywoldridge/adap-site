"use client";

import { useState } from "react";
import { useShippingEstimate, type ShippingLine } from "@/hooks/useShippingEstimate";

export default function CartShippingEstimator({
  lines,
  store = "US",
}: {
  lines: ShippingLine[];
  store?: "US" | "CA";
}) {
  const { loading, rates, error, estimate } = useShippingEstimate();
  const [zip, setZip] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState<"US" | "CA">("US");

  const onEstimate = async () => {
    await estimate({
      country,
      state,
      zip,
      store,
      items: lines,
    });
  };

  return (
    <div className="shipping-estimator" style={{ borderTop: "1px solid #eee", paddingTop: 16 }}>
      <h3 style={{ margin: "0 0 8px" }}>Estimate shipping</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8 }}>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value as "US" | "CA")}
          aria-label="Country"
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
        >
          <option value="US">United States</option>
          <option value="CA">Canada</option>
        </select>
        <input
          placeholder="State / Province"
          value={state}
          onChange={(e) => setState(e.target.value)}
          aria-label="State / Province"
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
        />
        <input
          placeholder="ZIP / Postal"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          aria-label="ZIP / Postal"
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
        />
        <button
          type="button"
          onClick={onEstimate}
          disabled={loading}
          className="shipping-estimator__button"
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            fontWeight: 600,
            background: "var(--color-blue)",
            color: "#fff",
            border: 0,
            cursor: "pointer",
          }}
        >
          {loading ? "Estimating..." : "Get Rates"}
        </button>
      </div>

      {error ? (
        <p style={{ color: "#b91c1c", marginTop: 10 }}>{error}</p>
      ) : null}

      {rates.length > 0 ? (
        <ul style={{ marginTop: 12, padding: 0, listStyle: "none" }}>
          {rates.map((r, i) => (
            <li
              key={`${r.service}-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <span>
                <strong>{r.service}</strong>
                {r.eta ? <span style={{ color: "#666" }}> — {r.eta}</span> : null}
              </span>
              <span>
                {r.cost.toLocaleString(undefined, {
                  style: "currency",
                  currency: (r.currency || "USD").toUpperCase(),
                })}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
