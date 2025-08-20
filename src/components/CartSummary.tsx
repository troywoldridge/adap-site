// src/components/CartSummary.tsx
"use client";

import { useState } from "react";

export type EstimateLine = {
  productId: number;
  optionIds: number[];
  quantity?: number;
};

type Rate = { carrier: string; method: string; price: number; days?: string | number };

export default function CartSummary({
  lines,
  currency = "USD",
  subtotal,
  store = "US",
}: {
  lines: EstimateLine[];
  currency?: "USD" | "CAD";
  subtotal: number;
  store?: "US" | "CA";
}) {
  const [promo, setPromo] = useState("");
  const [discount, setDiscount] = useState(0);
  const [shipCountry, setShipCountry] = useState<"US" | "CA">(store);
  const [shipState, setShipState] = useState("");
  const [shipZip, setShipZip] = useState("");
  const [rates, setRates] = useState<Rate[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<Rate | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function estimate() {
    setBusy(true);
    setError(null);
    setPick(null);
    try {
      const r = await fetch("/api/cart/estimate-shipping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          shipCountry,
          shipState,
          shipZip,
          items: lines.map(l => ({ productId: l.productId, optionIds: l.optionIds, quantity: l.quantity || 1 })),
        }),
      });
      const json = await r.json();
      if (!json.ok) throw new Error(json.error || "Estimate failed");
      const normalized: Rate[] = (json.rates || []).map((x: any) => ({
        carrier: x.carrier ?? "Carrier",
        method: x.method ?? "Method",
        price: Number(x.price ?? 0),
        days: x.days,
      }));
      setRates(normalized);
    } catch (e: any) {
      setError(e?.message ?? "Unknown shipping error");
    } finally {
      setBusy(false);
    }
  }

  function applyPromo() {
    // Placeholder: flat 10% off for DEMO10 (replace with your backend)
    if (promo.trim().toUpperCase() === "DEMO10") {
      setDiscount(subtotal * 0.1);
    } else {
      setDiscount(0);
    }
  }

  const shipping = pick?.price ?? 0;
  const total = Math.max(0, subtotal - discount) + shipping;

  return (
    <aside className="cart-summary">
      <h2 className="summary-title">Order Summary</h2>

      <div className="promo-block">
        <label className="label">Promo Code</label>
        <div className="promo-row">
          <input className="input" value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Enter code" />
          <button className="btn" onClick={applyPromo}>Apply</button>
        </div>
        {discount > 0 && <div className="promo-applied">−{new Intl.NumberFormat("en-US",{style:"currency",currency}).format(discount)}</div>}
      </div>

      <div className="ship-block">
        <label className="label">Delivery Estimate</label>
        <div className="ship-row">
          <select className="input" value={shipCountry} onChange={(e) => setShipCountry(e.target.value as "US" | "CA")}>
            <option value="US">US</option>
            <option value="CA">CA</option>
          </select>
          <input className="input" value={shipState} onChange={(e) => setShipState(e.target.value)} placeholder="State/Prov" />
          <input className="input" value={shipZip} onChange={(e) => setShipZip(e.target.value)} placeholder="ZIP/Postal" />
          <button className="btn" onClick={estimate} disabled={busy}>Get Rates</button>
        </div>

        {error && <div className="error-text">{error}</div>}

        {rates && (
          <ul className="rates">
            {rates.map((r, i) => (
              <li key={i}>
                <label className="rate-row">
                  <input
                    type="radio"
                    name="rate"
                    onChange={() => setPick(r)}
                    checked={pick?.carrier === r.carrier && pick?.method === r.method}
                  />
                  <span>{r.carrier} • {r.method} {r.days ? `(${r.days}d)` : ""}</span>
                  <span className="rate-price">{new Intl.NumberFormat("en-US", { style: "currency", currency }).format(r.price)}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="totals">
        <div className="row">
          <span>Subtotal</span>
          <span>{new Intl.NumberFormat("en-US", { style: "currency", currency }).format(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="row">
            <span>Discount</span>
            <span>−{new Intl.NumberFormat("en-US", { style: "currency", currency }).format(discount)}</span>
          </div>
        )}
        <div className="row">
          <span>Shipping</span>
          <span>{new Intl.NumberFormat("en-US", { style: "currency", currency }).format(shipping)}</span>
        </div>
        <div className="row total">
          <span>Total</span>
          <span>{new Intl.NumberFormat("en-US", { style: "currency", currency }).format(total)}</span>
        </div>
      </div>

      <button className="btn primary checkout-btn">Proceed to Checkout</button>
    </aside>
  );
}
