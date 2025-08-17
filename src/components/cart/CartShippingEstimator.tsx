// src/components/cart/CartShippingEstimator.tsx
"use client";
import { useState } from "react";

type Rate = { carrier: string; method: string; price: number; days: number };

export default function CartShippingEstimator({
  onQuote,
}: {
  onQuote?: (r: { rates: Rate[]; cheapest: Rate | null }) => void;
}) {
  const [country, setCountry] = useState<"US" | "CA">("US");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<Rate[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function fetchRates() {
    if (!state || !zip) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cart/estimate-shipping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ country, state, zip }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to estimate");
      }
      setRates(data.rates || []);
      onQuote?.({ rates: data.rates || [], cheapest: data.cheapest || null });
    } catch (e: any) {
      setError(e?.message || "Failed to estimate");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ship-est">
      <div className="ship-row">
        <select className="input" value={country} onChange={(e) => setCountry(e.target.value as "US" | "CA")}>
          <option value="US">United States</option>
          <option value="CA">Canada</option>
        </select>
        <input className="input" placeholder={country === "US" ? "State (NY)" : "Prov (ON)"} value={state}
               onChange={(e) => setState(e.target.value.toUpperCase())} />
        <input className="input" placeholder={country === "US" ? "ZIP (10001)" : "Postal (M5V 2T6)"} value={zip}
               onChange={(e) => setZip(e.target.value)} />
        <button className="btn" onClick={fetchRates} disabled={loading}>
          {loading ? "Getting rates…" : "Get rates"}
        </button>
      </div>

      {error && <p className="muted" style={{ color: "#991b1b", marginTop: 8 }}>{error}</p>}

      {rates.length > 0 && (
        <div className="ship-methods">
          {rates.map((r, i) => (
            <div key={i} className="ship-line">
              <span>{r.carrier} — {r.method} ({r.days} business day{r.days === 1 ? "" : "s"})</span>
              <strong>${r.price.toFixed(2)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
