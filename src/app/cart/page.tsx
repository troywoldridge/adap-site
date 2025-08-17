// src/app/cart/page.tsx
"use client";

import { useMemo, useCallback } from "react";
import { useCart } from "@/lib/cart-client";
import UploadCta from "@/components/UploadCta";
import CartShippingEstimator from "@/components/cart/CartShippingEstimator";

type ArtworkRecord = Record<string, string> | Array<{ side: number; url: string }>;

function toRecord(existing?: ArtworkRecord | null): Record<string, string> {
  if (!existing) {
    return {};
  }
  if (Array.isArray(existing)) {
    const out: Record<string, string> = {};
    for (const r of existing) if (r && Number.isFinite(Number(r.side)) && r.url) out[String(r.side)] = r.url;
    return out;
  }
  return existing;
}

export default function CartPage() {
  const { cart, loading, refresh } = useCart();

  const changeQty = useCallback(
    async (id: string, next: number) => {
      if (!Number.isFinite(next) || next < 1) return;
      await fetch("/api/cart/update", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lineId: id, quantity: next }),
      });
      await refresh();
    },
    [refresh]
  );

  const removeLine = useCallback(
    async (id: string) => {
      await fetch("/api/cart/remove", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lineId: id }),
      });
      await refresh();
    },
    [refresh]
  );

  const totals = useMemo(() => {
    const currency = cart.currency ?? "USD";
    const subtotal = (cart.items ?? []).reduce((sum, it) => sum + (it.lineTotal ?? 0), 0);
    return { currency, subtotal };
  }, [cart]);

  if (loading) return <main className="page-container">Loading…</main>;

  return (
    <main className="page-container" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 }}>
      <section>
        <h1 className="cart-title">Your Cart</h1>

        {cart.items.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          cart.items.map((item) => {
            const artwork = toRecord(item.artwork as any);
            const artThumb = artwork["1"]; // prefer side 1 if present
            const rowThumb = artThumb || item.image || null;

            return (
              <div key={item.id} className="cart-line">
                <div className="cart-line-head">
                  <div className="cart-line-left">
                    {rowThumb ? <img src={rowThumb} alt="" className="cart-thumb" /> : null}
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

                {/* Qty + remove */}
                <div className="cart-qty-row">
                  <button className="qty-btn" onClick={() => changeQty(item.id, Math.max(1, item.quantity - 1))}>
                    −
                  </button>
                  <span className="qty-display">{item.quantity}</span>
                  <button className="qty-btn" onClick={() => changeQty(item.id, item.quantity + 1)}>
                    +
                  </button>

                  <button className="trash-btn" aria-label="Remove item" onClick={() => removeLine(item.id)}>
                    🗑️
                  </button>
                </div>

                {/* Artwork uploader (per side) */}
                <div className="divider" />
                <UploadCta lineId={item.id} numSides={item.numSides ?? 1} existing={artwork} />
              </div>
            );
          })
        )}
      </section>

      {/* Right rail summary like big stores */}
      <aside style={{ position: "sticky", top: 16, alignSelf: "start" }}>
        <div className="ui-card">
          <h3 className="section-title">Order Summary</h3>

          <div className="cart-summary-row">
            <span>Subtotal</span>
            <span>
              {totals.currency} {totals.subtotal.toFixed(2)}
            </span>
          </div>

          {/* Promo code box (client-only no-op for now) */}
          <div style={{ marginTop: 8 }}>
            <label htmlFor="promo" className="muted" style={{ display: "block", marginBottom: 4 }}>
              Promo code
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input id="promo" className="input" placeholder="Enter code" />
              <button className="btn">Apply</button>
            </div>
          </div>

          {/* Cart-level shipping estimator */}
          <div className="divider" />
          <CartShippingEstimator />
            <button className="btn btn-primary" onClick={async () => {
              const country = (document.getElementById("ship-country") as HTMLSelectElement).value as "US"|"CA";
              const state = (document.getElementById("ship-state") as HTMLInputElement).value;
              const zip = (document.getElementById("ship-zip") as HTMLInputElement).value;
              const res = await fetch("/api/cart/estimate-shipping", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ country, state, zip }),
              });
              const data = await res.json();
              // render data.methods
            }}>
              Get rates
            </button>
          <a className="btn btn-primary" href="/checkout" style={{ marginTop: 12, width: "100%", display: "inline-block", textAlign: "center" }}>
            Continue to checkout
          </a>
        </div>
      </aside>
    </main>
  );
}
