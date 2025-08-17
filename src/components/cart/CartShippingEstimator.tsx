"use client";

import { useState } from "react";

type Rate = { name: string; amount: number; currency: string; days: number };

type Props = {
  defaultCountry?: "US" | "CA";
  defaultRegion?: string;
  defaultPostal?: string;
  onQuote?: (q: { methods: Rate[]; cheapest?: Rate | null }) => void;
};

export default function CartShippingEstimator({
  defaultCountry = "US",
  defaultRegion = "",
  defaultPostal = "",
  onQuote,
}: Props = {}) {
  const [country, setCountry] = useState<"US" | "CA">(defaultCountry);
  const [region, setRegion] = useState(defaultRegion);
  const [postal, setPostal] = useState(defaultPostal);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<{ methods: Rate[]; cheapest?: Rate | null } | null>(null);

  const canQuote = Boolean(country && region && postal);

  async function handleEstimate() {
    setLoading(true);
    setQuote(null);
    const res = await fetch("/api/shipping/estimate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ country, region, postal }),
    });
    const data = await res.json();
    setQuote(data);
    onQuote?.(data);
    setLoading(false);
  }

  return (
    <div className="ship-est">
      <div className="ship-row">
        <select value={country} onChange={(e) => setCountry((e.target.value as "US" | "CA") || "US")}>
          <option value="US">United States</option>
          <option value="CA">Canada</option>
        </select>
        <input placeholder="State/Province" value={region} onChange={(e) => setRegion(e.target.value)} />
        <input placeholder="Postal Code" value={postal} onChange={(e) => setPostal(e.target.value)} />
        <button className="btn-primary" onClick={handleEstimate} disabled={loading || !canQuote}>
          {loading ? "Getting rates…" : "Estimate shipping"}
        </button>
      </div>

      {quote?.methods?.length ? (
        <div className="ship-methods">
          {quote.methods.map((m, i) => (
            <div key={i} className="ship-line">
              <span>{m.name}</span>
              <span>
                {m.currency} {Number(m.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
