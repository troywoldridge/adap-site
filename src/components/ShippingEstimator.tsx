"use client";
import { useState } from "react";
import type { SinaliteShippingEstimateRequest, SinaliteShippingMethod } from "@/types/shipping";

interface Props {
  orderData: SinaliteShippingEstimateRequest;
  accessToken: string;
  onSelect?: (method: SinaliteShippingMethod) => void;
  showSelector?: boolean;
}

export default function ShippingEstimator({
  orderData,
  accessToken,
  onSelect,
  showSelector = false
}: Props) {
  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<SinaliteShippingMethod[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  async function fetchShipping() {
    setLoading(true);
    setError(null);
    setMethods([]);
    try {
      const res = await fetch("/api/shippingEstimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderData, accessToken })
      });
      if (!res.ok) {
        throw new Error(`Server error: ${res.statusText}`);
      }
      const data = await res.json();
      setMethods(data);
      if (onSelect && !showSelector && data.length) {
        onSelect(data[0]);
      }
    } catch (e: any) {
      setError(e.message || "Error fetching shipping estimates");
    }
    setLoading(false);
  }

  return (
    <section className="shipping-estimator">
      <h3 className="shipping-estimator__title">Shipping Estimate</h3>
      <button
        className="shipping-estimator__button"
        onClick={fetchShipping}
        disabled={loading}
        type="button"
      >
        {loading ? "Fetching rates…" : "Get Shipping Options"}
      </button>
      {error && <div className="shipping-estimator__error">{error}</div>}
      {!loading && methods.length === 0 && !error && (
        <div className="shipping-estimator__empty">No rates yet. Click above!</div>
      )}
      <ul className="shipping-estimator__list">
        {methods.map((method, idx) => (
          <li
            key={idx}
            className={`shipping-rate${selected === idx ? " is-selected" : ""}`}
            onClick={() => {
              if (showSelector) {
                setSelected(idx);
                if (onSelect) onSelect(method);
              }
            }}
            style={{
              cursor: showSelector ? "pointer" : "default"
            }}
          >
            <span className="shipping-rate__carrier">{method.carrier}</span>
            <span className="shipping-rate__service">{method.service}</span>
            <span className="shipping-rate__price">
              {method.price.toLocaleString("en-US", { style: "currency", currency: "USD" })}
            </span>
            {!method.available && (
              <span className="shipping-rate__unavailable">(Unavailable)</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
