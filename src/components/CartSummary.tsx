"use client";

import { useMemo } from "react";
import CartShippingEstimator from "./CartShippingEstimator";

export default function CartSummary({
  lines,
  currency,
  subtotal,
  store = "US",
}: {
  lines: { productId: number; optionIds: number[]; quantity: number }[];
  currency: "USD" | "CAD";
  subtotal: number;
  store?: "US" | "CA";
}) {
  const fmt = useMemo(
    () => (n: number) =>
      n.toLocaleString(undefined, {
        style: "currency",
        currency,
      }),
    [currency]
  );

  return (
    <div className="cart-summary" style={{ position: "sticky", top: 24 }}>
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          background: "#fff",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Summary</h2>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span>Subtotal</span>
          <strong>{fmt(subtotal)}</strong>
        </div>

        {/* Shipping estimator */}
        <CartShippingEstimator lines={lines} store={store} />

        <button
          type="button"
          style={{
            marginTop: 16,
            width: "100%",
            padding: "12px 16px",
            borderRadius: 10,
            background: "var(--color-blue)",
            color: "#fff",
            border: 0,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Checkout
        </button>
      </div>
    </div>
  );
}
