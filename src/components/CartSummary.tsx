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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setError(null);
    if (!lines?.length) return;

    try {
      setBusy(true);

      // (Optional) ensure the selected shipping is saved server-side
      if (selectedShipping) {
        await fetch("/api/cart/shipping/choose", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            carrier: selectedShipping.carrier,
            method: selectedShipping.method,
            cost: selectedShipping.cost,
            days: selectedShipping.days ?? null,
            currency: selectedShipping.currency,
            country: store === "CA" ? "CA" : "US",
            state: "",
            zip: "",
          }),
        }).catch(() => {});
      }

      // Start Stripe Checkout — our API responds with { ok, url }
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/checkout/success`,
        }),
      });

      if (res.status === 401) {
        // If your middleware ever requires auth, send them to sign-in and back
        window.location.assign(`/sign-in?redirect_url=/cart/review`);
        return;
      }

      // Accept either {ok:true,url} or a 303 redirect (fallback below)
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const json = await res.json().catch(() => ({} as any));
        if (!res.ok || !json?.url) {
          throw new Error(json?.error || `Failed to start checkout`);
        }
        window.location.assign(json.url as string);
        return;
      }

      // Fallback: if the API replies with a redirect and fetch swallowed it,
      // just navigate to the endpoint; the server will redirect the browser.
      window.location.assign("/api/create-checkout-session");
    } catch (e: any) {
      setError(String(e?.message || e));
      setBusy(false);
    }
  }

  const shippingCost = selectedShipping?.cost ?? 0;
  const total = subtotal + (typeof shippingCost === "number" ? shippingCost : 0);

  return (
    <div className="cart-summary">
      <aside style={{ margin: "0 0 12px" }}>
        <h3 style={{ margin: "0 0 12px" }}>Summary</h3>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
          <div>Subtotal</div>
          <div>{money(subtotal, currency)}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
          <div>Shipping</div>
          <div>{money(shippingCost, currency)}</div>
        </div>

        <div
          style={{
            marginTop: 8,
            paddingTop: 10,
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          <div>Total</div>
          <div>{money(total, currency)}</div>
        </div>
      </aside>

      <div className="shipping-estimator">
        <h4 style={{ margin: "0 0 8px" }}>Estimate shipping</h4>
        <div className="estimator">
          <CartShippingEstimator
            lines={lines}
            store={store}
            selected={selectedShipping}
            onSelect={onChangeShipping}
          />
        </div>
      </div>

      {error ? (
        <div style={{ color: "#b42318", marginTop: 10 }}>{error}</div>
      ) : null}

      <ProceedToCheckout
  shipping={selectedShipping}
  className="btn btn-primary checkout-btn"
/>

     </div>
  );
}
