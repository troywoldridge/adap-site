"use client";

import CartShippingEstimator, {
  CartLineMini,
  ShippingRate,
} from "./CartShippingEstimator";

type Props = {
  currency: "USD" | "CAD";
  /** Subtotal (items only) from current cart */
  subtotal: number;
  /** Mini lines for estimator */
  lines: CartLineMini[];
  /** "US" | "CA" */
  store: "US" | "CA";
  /** Current selected shipping (can be null) */
  selectedShipping: ShippingRate | null;
  /** Bubble selection up */
  onChangeShipping: (rate: ShippingRate | null) => void;
};

function money(n: number, currency: "USD" | "CAD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    n || 0
  );
}

export default function CartSummary({
  currency,
  subtotal,
  lines,
  store,
  selectedShipping,
  onChangeShipping,
}: Props) {
  const shippingCost =
    selectedShipping && selectedShipping.currency === currency
      ? selectedShipping.cost
      : selectedShipping
      ? // defensive: if currencies ever differ, still add raw cost
        selectedShipping.cost
      : 0;

  const total = (subtotal || 0) + (shippingCost || 0);

  return (
    <aside
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        position: "sticky",
        top: 16,
      }}
    >
      <h3 style={{ margin: "0 0 12px" }}>Summary</h3>

      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "6px 0",
          }}
        >
          <span>Subtotal</span>
          <strong>{money(subtotal, currency)}</strong>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "6px 0",
          }}
        >
          <span>Shipping</span>
          <strong>
            {selectedShipping
              ? money(shippingCost, currency)
              : money(0, currency)}
          </strong>
        </div>

        <div
          style={{
            marginTop: 8,
            borderTop: "1px solid #e5e7eb",
            paddingTop: 10,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          <span>Total</span>
          <span>{money(total, currency)}</span>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <h4 style={{ margin: "0 0 8px" }}>Estimate shipping</h4>
        <CartShippingEstimator
          lines={lines}
          store={store}
          selected={selectedShipping}
          onSelect={onChangeShipping}
        />
      </div>

      <button
        className="btn-primary"
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 8,
          background: "var(--color-blue)",
          color: "#fff",
          fontWeight: 800,
        }}
      >
        Checkout
      </button>
    </aside>
  );
}
