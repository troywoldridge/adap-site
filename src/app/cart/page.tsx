// src/app/cart/page.tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import { useCart } from "@/lib/cart-client";
import UploadCta from "@/components/UploadCta";
import CartShippingEstimator from "@/components/cart/CartShippingEstimator";

const FREE_SHIP_THRESHOLD = 99;

export default function CartPage() {
  const { cart, loading, refresh } = useCart();
  const [shipQuote, setShipQuote] = useState<{ total?: number; days?: number } | null>(null);
  const [promo, setPromo] = useState("");
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  const changeQty = useCallback(async (id: string, next: number) => {
    if (!Number.isFinite(next) || next < 1) {
      return;
    }
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

  const subtotal = cart.subtotal ?? 0;
  const shipping = shipQuote?.total ?? 0;
  const tax = Math.max(0, Math.round(((subtotal + shipping) * 0.07) * 100) / 100); // demo only
  const orderTotal = subtotal + shipping + tax;

  const freeProgress = useMemo(() => {
    if (!FREE_SHIP_THRESHOLD) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round((subtotal / FREE_SHIP_THRESHOLD) * 100)));
  }, [subtotal]);

  async function applyPromo() {
    if (!promo.trim()) {
      return;
    }
    setPromoMessage(`Code “${promo.toUpperCase()}” applied (demo).`);
  }

  if (loading) return <main className="page-container">Loading…</main>;

  return (
    <main className="page-container" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 }}>
      <section>
        <h1 className="cart-title">Your Cart</h1>

        {!!FREE_SHIP_THRESHOLD && (
          <div className="ui-card" style={{ marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 6 }}>
              {subtotal >= FREE_SHIP_THRESHOLD
                ? "You’ve unlocked free shipping!"
                : `Spend $${(FREE_SHIP_THRESHOLD - subtotal).toFixed(2)} more to unlock free shipping`}
            </div>
            <div style={{ height: 8, background: "#e5e7eb", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ width: `${freeProgress}%`, height: "100%", background: "#22c55e" }} />
            </div>
          </div>
        )}

        {cart.items.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          cart.items.map((item) => {
            // ✅ RIGHT HERE: map array -> record for UploadCta.existing
            const existingMap = (item.artwork ?? []).reduce((acc, a) => {
              acc[String(a.side)] = a.url;
              return acc;
            }, {} as Record<string, string>);

            return (
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
                  <button className="qty-btn" onClick={() => changeQty(item.id, Math.max(1, item.quantity - 1))} aria-label="Decrease quantity">−</button>
                  <span className="qty-display">{item.quantity}</span>
                  <button className="qty-btn" onClick={() => changeQty(item.id, item.quantity + 1)} aria-label="Increase quantity">+</button>
                  <button className="trash-btn" aria-label="Remove item" onClick={() => removeLine(item.id)} title="Remove item">🗑️</button>
                </div>

                <div className="divider" />

                {/* ✅ Upload/Replace thumbnails per side (existing record passed) */}
                <UploadCta
                  lineId={item.id}
                  numSides={item.numSides ?? 1}
                  existing={Object.keys(existingMap).length ? existingMap : null}
                />
              </div>
            );
          })
        )}
      </section>

      {/* Sticky order summary */}
      <aside style={{ position: "sticky", top: 16, alignSelf: "start" }}>
        <div className="ui-card">
          <h3 className="section-title">Order Summary</h3>

          <div className="form-row" style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input className="input" placeholder="Promo code" value={promo} onChange={(e) => setPromo(e.target.value)} />
            <button className="btn" onClick={applyPromo}>Apply</button>
          </div>
          {promoMessage && <p className="muted" style={{ marginTop: 4 }}>{promoMessage}</p>}

          <div className="cart-summary">
            <div className="cart-summary-row"><span>Subtotal</span><span>{(cart.currency ?? "USD")} {subtotal.toFixed(2)}</span></div>

            <CartShippingEstimator onQuote={(q) => setShipQuote({ total: q.cheapest?.price, days: q.cheapest?.days })} />
            <div className="cart-summary-row"><span>Shipping</span><span>{shipQuote?.total != null ? `$${shipQuote.total.toFixed(2)}` : "—"}</span></div>

            <div className="cart-summary-row"><span>Tax (est.)</span><span>${tax.toFixed(2)}</span></div>
            <div className="cart-summary-row" style={{ fontWeight: 700, borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
              <span>Total</span><span>{(cart.currency ?? "USD")} {orderTotal.toFixed(2)}</span>
            </div>

            {shipQuote?.days != null && (
              <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                Est. delivery in {shipQuote.days} business day{shipQuote.days === 1 ? "" : "s"} (per SinaLite).
              </div>
            )}

            <a className="btn btn-primary" href="/checkout" style={{ marginTop: 12, width: "100%", display: "block", textAlign: "center" }}>
              Continue to checkout
            </a>
          </div>
        </div>
      </aside>
    </main>
  );
}
