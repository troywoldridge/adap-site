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
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n || 0);
}

export default function CartSummary({
  currency,
  subtotal,
  lines,
  store,
  selectedShipping,
  onChangeShipping,
}: Props) {
  const [error] = useState<string | null>(null);

  const shippingCost = selectedShipping?.cost ?? 0;
  const total = subtotal + (typeof shippingCost === "number" ? shippingCost : 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      {/* Title */}
      <h3 className="text-base font-extrabold tracking-tight mb-2">Order Summary</h3>

      {/* Subtotal */}
      <div className="flex items-center justify-between py-1 text-sm">
        <span className="text-slate-500">Subtotal</span>
        <span className="font-medium">{money(subtotal, currency)}</span>
      </div>

      {/* Shipping */}
      <div className="flex items-center justify-between py-1 text-sm">
        <span className="text-slate-500">Shipping</span>
        <span className="font-medium">{money(shippingCost, currency)}</span>
      </div>

      {/* Total */}
      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
        <span className="text-sm font-semibold">Total</span>
        <span className="text-lg font-extrabold">{money(total, currency)}</span>
      </div>

      {/* Estimator */}
      <div className="mt-4">
        <h4 className="text-sm font-semibold mb-2">Estimate shipping</h4>

        {/* Keep these classes so the tiny CSS below can arrange the inner fields. */}
        <div className="estimator estimator--compact bg-white border border-gray-200 rounded-xl p-4">
          <CartShippingEstimator
            /* Items + shipping inputs align to Sinalite API (ShipCountry, ShipState, ShipZip) */
            lines={lines}
            store={store}
            selected={selectedShipping}
            onSelect={onChangeShipping}
          />
        </div>
      </div>

      {/* Error (if any) */}
      {error ? (
        <div className="mt-3 text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}

      {/* Checkout CTA */}
      <div className="mt-4">
        <ProceedToCheckout className="w-full h-10 rounded-lg font-bold bg-blue-700 hover:bg-blue-800 text-white border border-transparent transition">
          Continue to checkout
        </ProceedToCheckout>
      </div>

      {/* ——— Minimal scoped CSS only for the estimator grid ———
          Why: Tailwind can’t style unknown grandchildren inside CartShippingEstimator.
          This forces: Country | State/Prov | ZIP/Postal on one row, then full-width button. */}
      <style jsx global>{`
  /* CART SUMMARY — compact, deduped, scoped */
.cart2__right .order-summary .estimator,
.cart2__right .order-summary .estimator :where(form,.estimator__inputs,.estimator__rates){
  width:100%!important; max-width:none!important; margin:0!important;
}

/* Inputs row: Country | State | ZIP; full-width CTA on next row */
.estimator.estimator--compact :where(form,.estimator__inputs){
  display:grid!important;
  grid-template-columns:minmax(150px,1fr) 88px 140px!important;
  gap:12px!important;
  align-items:end!important;
}
@media (max-width:640px){
  .estimator.estimator--compact :where(form,.estimator__inputs){ grid-template-columns:1fr 1fr!important; }
  .estimator.estimator--compact :where(form) > :nth-child(3){ grid-column:1 / -1!important; }
}

/* Controls */
.estimator.estimator--compact :where(select,input){
  height:36px!important; width:100%!important; box-sizing:border-box!important;
  padding:0 10px!important; border:1px solid #e5e7eb!important; border-radius:8px!important;
  background:#fff!important; font-size:.95rem!important; line-height:1!important;
}
.estimator.estimator--compact :where(select,input):focus{
  outline:2px solid transparent!important;
  box-shadow:0 0 0 3px rgba(0,98,255,.2)!important;
  border-color:rgba(0,98,255,.5)!important;
}

/* CTA — match checkout button */
.estimator.estimator--compact :where(button,[type="submit"],.shipping-estimator__button){
  grid-column:1 / -1!important; height:40px!important; padding:0 16px!important;
  border-radius:10px!important; font-weight:700!important;
  background:#1e40af!important; color:#fff!important; border:1px solid transparent!important;
}
.estimator.estimator--compact :where(button,[type="submit"],.shipping-estimator__button):hover{ filter:brightness(.98); }

/* Rates list */
.estimator.estimator--compact .estimator__rates{ list-style:none; margin:14px 0 0; padding:0; }

/* Rate row: radio | name | price; ETA under name */
.estimator.estimator--compact .estimator__rate{
  display:grid!important;
  grid-template-columns:28px 1fr auto;
  grid-template-rows:auto auto;
  grid-template-areas:"radio name price" "radio eta price";
  column-gap:14px; row-gap:6px;
  width:100%; padding:14px;
  border-radius:10px; background:#f8fafc; border:1px solid #eef2f7;
}
.estimator.estimator--compact .estimator__rate + .estimator__rate{ margin-top:8px; }

.estimator.estimator--compact .estimator__rate :where(input[type="radio"]){
  grid-area:radio!important; justify-self:center; align-self:start;
  transform:scale(.82); accent-color:#1e40af;
}
.estimator.estimator--compact .estimator__rate-name{ grid-area:name!important; white-space:normal!important; }
.estimator.estimator--compact .estimator__rate-name > *{ display:inline; vertical-align:middle; }
.estimator.estimator--compact .estimator__rate-name > * + *{ margin-left:8px; }
.estimator.estimator--compact .estimator__rate-eta{ grid-area:eta!important; margin:0; font-size:.9rem; color:#667085; }
.estimator.estimator--compact .estimator__rate-right{
  grid-area:price!important; justify-self:end; align-self:center; min-width:96px; white-space:nowrap; font-weight:700;
}

/* Card padding + summary spacing */
.order-summary{ padding:16px!important; }
.order-summary .reviewpg__sumKV{ padding:8px 0!important; }
.order-summary .estimator{ margin-top:12px!important; }

/* Left column: make "Remove" a blue pill again */
.cart2__rowRight .link-dim{
  display:inline-flex;
  align-items:center; justify-content:center;
  height:36px; padding:0 12px;
  border-radius:10px; font-weight:700;
  background:#1e40af;            /* blue fill */
  color:#fff;                     /* white text */
  border:1px solid transparent;
  text-decoration:none;
}
.cart2__rowRight .link-dim:hover{ filter:brightness(.98); }
.cart2__rowRight .link-dim:focus-visible{
  outline:2px solid transparent;
  box-shadow:0 0 0 3px rgba(30,64,175,.25); /* subtle focus ring */
}


      `}</style>
    </div>
  );
}

