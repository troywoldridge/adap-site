"use client";

import { useCallback } from "react";
import { useCart } from "@/lib/cart-client";
import UploadCta from "@/components/UploadCta";
import CartShippingEstimator from "@/components/cart/CartShippingEstimator";


export default function CartPage() {
  const { cart, loading, refresh } = useCart();

  const changeQty = useCallback(async (id: string, next: number) => {
    if (!Number.isFinite(next) || next < 1) return;
    await fetch("/api/cart/update", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lineId: id, quantity: next }),
    });
    await refresh();
  }, [refresh]);

  const removeLine = useCallback(async (id: string) => {
    await fetch("/api/cart/remove", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lineId: id }),
    });
    await refresh();
  }, [refresh]);

  if (loading) {
    return <main className="page-container">Loading…</main>;
  }

  return (
    <main className="page-container">
      <h1 className="cart-title">Your Cart</h1>

      {cart.items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        cart.items.map((item) => (
          <div key={item.id} className="cart-line">
            <div className="cart-line-head">
              <div className="cart-line-left">
                {item.image ? <img src={item.image} alt="" className="cart-thumb" /> : null}
                <div>
                  <div className="cart-line-name">{item.name ?? `Product ${item.productId}`}</div>
                  <div className="cart-line-meta">
                    Qty {item.quantity} • {(item.currency ?? "USD")}{" "}
                    {item.unitPrice != null ? item.unitPrice.toFixed(2) : "—"} each
                  </div>
                </div>
              </div>
              <div className="cart-line-total">
                {(item.currency ?? "USD")} {item.lineTotal != null ? item.lineTotal.toFixed(2) : "—"}
              </div>
            </div>

            {/* Qty +/-, remove */}
            <div className="cart-qty-row">
              <button
                className="qty-btn"
                onClick={() => changeQty(item.id, Math.max(1, item.quantity - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="qty-display">{item.quantity}</span>
              <button
                className="qty-btn"
                onClick={() => changeQty(item.id, item.quantity + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>

              <button
                className="trash-btn"
                aria-label="Remove item"
                onClick={() => removeLine(item.id)}
                title="Remove item"
              >
                🗑️
              </button>
            </div>

            {/* Upload thumbnails per side (NOT the product image) */}
            <div className="divider" />
            <UploadCta
              lineId={item.id}
              numSides={item.numSides ?? 1}
              existing={item.artwork ?? undefined}
            />
          </div>
        ))
      )}

      {/* Summary + shipping + checkout */}
      <div className="cart-summary">
        <div className="cart-summary-row">
          <span>Subtotal</span>
          <span>
            {(cart.currency ?? "USD")} {(cart.subtotal ?? 0).toFixed(2)}
          </span>
        </div>

        {/* Estimate shipping for entire cart */}
        <CartShippingEstimator />
        <a className="btn btn-primary" href="/checkout" style={{ marginTop: 12 }}>
          Continue to checkout
        </a>
      </div>
    </main>
  );
}
