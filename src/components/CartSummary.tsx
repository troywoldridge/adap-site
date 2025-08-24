"use client";

import { useState } from "react";
import CartShippingEstimator, {
  type CartLineMini,
  type ShippingRate,
} from "./CartShippingEstimator";
import ProceedToCheckout from "@/components/ProceedToCheckout";

type Props = {
  currency: "USD" | "CAD";
  subtotal: number;
  lines: CartLineMini[];
  store: "US" | "CA";
  selectedShipping: ShippingRate | null;
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
  const [error, setError] = useState<string | null>(null);

  const shippingCost = selectedShipping?.cost ?? 0;
  const total = subtotal + (typeof shippingCost === "number" ? shippingCost : 0);

  return (
    // add order-summary so globals (and our scoped rules) can target it
    <div className="reviewpg__card order-summary">
      <aside>
        <h3 className="reviewpg__sumTitle">Order Summary</h3>

        <div className="reviewpg__sumKV">
          <div className="dim">Subtotal</div>
          <div>{money(subtotal, currency)}</div>
        </div>

        <div className="reviewpg__sumKV">
          <div className="dim">Shipping</div>
          <div>{money(shippingCost, currency)}</div>
        </div>

        <div className="reviewpg__sumTotal">
          <div>Total</div>
          <div>{money(total, currency)}</div>
        </div>
      </aside>

      {/* Get rates ABOVE checkout */}
      <div className="mt-4">
        <h4 style={{ margin: "0 0 8px" }}>Estimate shipping</h4>

        {/* Scoped wrapper the CSS below will hook onto */}
        <div className="reviewpg__shipCard estWrap">
          <CartShippingEstimator
            lines={lines}
            store={store}
            selected={selectedShipping}
            onSelect={onChangeShipping}
          />
        </div>
      </div>

      {error ? <div style={{ color: "#b42318", marginTop: 10 }}>{error}</div> : null}

      <div className="reviewpg__cta">
        <ProceedToCheckout className="btn btn-primary checkout-btn">
          Continue to checkout
        </ProceedToCheckout>
      </div>

      {/* ===== SCOPED CSS – only affects elements inside .estWrap ===== */}
      <style jsx>{`
        /* Grid the form: Country | State | ZIP on one row, button full width after */
        .estWrap :global(form) {
          display: grid !important;
          grid-template-columns: minmax(150px, 1fr) 88px 140px !important;
          gap: 10px !important;
          align-items: end;
        }

        /* Make the first three controls consistent */
        .estWrap :global(form > select),
        .estWrap :global(form > input) {
          height: 36px !important;
          padding: 0 10px !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          background: #fff !important;
          font-size: 0.93rem !important;
          box-sizing: border-box !important;
        }
        .estWrap :global(form > select:focus),
        .estWrap :global(form > input:focus) {
          outline: 2px solid transparent !important;
          box-shadow: 0 0 0 3px rgba(0, 98, 255, 0.2) !important;
          border-color: rgba(0, 98, 255, 0.5) !important;
        }

        /* Full-width submit button on its own row */
        .estWrap :global(form > button[type="submit"]) {
          grid-column: 1 / -1 !important;
          height: 40px !important;
          border-radius: 10px !important;
          font-weight: 700 !important;
        }

        /* Mobile: stack 2 columns then ZIP + button full width */
        @media (max-width: 640px) {
          .estWrap :global(form) {
            grid-template-columns: 1fr 1fr !important;
          }
          .estWrap :global(form > button[type="submit"]) {
            grid-column: 1 / -1 !important;
          }
        }
      `}</style>
    </div>
  );
}
