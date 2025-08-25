// src/app/cart/CartPageClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import CartSummary from "@/components/CartSummary";
import type { ShippingRate } from "@/components/CartShippingEstimator";

type AnyItem = {
  id: string;
  productId: number;
  name?: string | null;
  optionIds: number[];
  quantity: number;
  cloudflareImageId?: string | null;
  serverUnitPrice?: number;  // from server
  unitPrice?: number;        // client override
};

type SavedItem = {
  id: string;
  productId: number;
  name?: string | null;
  optionIds: number[];
  quantity: number;
  cloudflareImageId?: string | null;
  unitPrice?: number;
};

type Props = {
  initialItems: AnyItem[];
  currency: "USD" | "CAD";
  store: "US" | "CA";
  initialShipping: ShippingRate | null;
};

const money = (n: number, currency: "USD" | "CAD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format((Number(n) || 0));

function cfImgUrl(id?: string | null) {
  if (!id) {
    return null;
  }
  const acct = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH || "pJ0fKvjCAbyoF8aD0BGu8Q";
  return `https://imagedelivery.net/${acct}/${id}/public`;
}

const SAVED_KEY = "ADAP_SAVED_V1";

export default function CartPageClient({ initialItems, currency, store, initialShipping }: Props) {
  const [items, setItems] = useState<AnyItem[]>(initialItems || []);
  const [selectedShipping, setSelectedShipping] = useState<ShippingRate | null>(initialShipping);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedItem[]>([]);

  // Load saved list (localStorage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {}
  }, []);
  function persistSaved(next: SavedItem[]) {
    setSaved(next);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch {}
  }

  // Subtotal from authoritative serverUnitPrice (falls back to unitPrice)
  const subtotal = useMemo(
    () =>
      (items || []).reduce((sum, it) => {
        const unit =
          typeof it.serverUnitPrice === "number"
            ? it.serverUnitPrice
            : typeof it.unitPrice === "number"
            ? it.unitPrice
            : 0;
        return sum + unit * (it.quantity || 1);
      }, 0),
    [items],
  );

  // Minimal lines to feed shipping estimator
  const miniLines = useMemo(
    () =>
      (items || []).map((it) => ({
        productId: it.productId,
        optionIds: it.optionIds || [],
        quantity: it.quantity || 1,
      })),
    [items],
  );

  // Refresh cart from server; handle both shapes: {items,...} or {cart:{items,...}}
  async function refreshFromServer() {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();

      const itemsShape: AnyItem[] =
        (json?.items as AnyItem[]) ??
        (json?.cart?.items as AnyItem[]) ??
        [];

      const srvItems =
        itemsShape.map((it) => ({
          ...it,
          serverUnitPrice:
            typeof it.unitPrice === "number" ? it.unitPrice : it.serverUnitPrice,
        })) || [];
      setItems(srvItems);

      const srvShip: any =
        json?.selectedShipping ??
        json?.cart?.selectedShipping ??
        json?.cart?.shipping ??
        null;

      if (srvShip && typeof srvShip?.cost === "number") {
        setSelectedShipping({
          carrier: String(srvShip.carrier ?? ""),
          method: String(srvShip.method ?? ""),
          cost: Number(srvShip.cost ?? 0) || 0,
          days: typeof srvShip.days === "number" ? srvShip.days : null,
          currency: srvShip.currency === "CAD" ? "CAD" : "USD",
        });
      } else {
        setSelectedShipping(null);
      }
    } catch {}
  }

  async function removeLine(lineId: string) {
    setBusyId(lineId);
    try {
      await fetch(`/api/cart/lines/${encodeURIComponent(lineId)}`, { method: "DELETE", cache: "no-store" });
      await refreshFromServer();
    } finally {
      setBusyId(null);
    }
  }

  async function updateQty(lineId: string, qty: number) {
    qty = Math.max(1, Math.min(9999, Math.floor(qty)));
    setBusyId(lineId);
    try {
      await fetch(`/api/cart/lines/${encodeURIComponent(lineId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quantity: qty }),
        cache: "no-store",
      });
      await refreshFromServer();
    } finally {
      setBusyId(null);
    }
  }

  // Save locally, remove from cart
  async function saveForLater(line: AnyItem) {
    setBusyId(line.id);
    try {
      const snapshotUnit =
        typeof line.serverUnitPrice === "number"
          ? line.serverUnitPrice
          : typeof line.unitPrice === "number"
          ? line.unitPrice
          : undefined;

      const next: SavedItem = {
        id: crypto.randomUUID(),
        productId: line.productId,
        name: line.name,
        optionIds: Array.isArray(line.optionIds) ? line.optionIds : [],
        quantity: Number(line.quantity || 1),
        cloudflareImageId: line.cloudflareImageId ?? null,
        unitPrice: snapshotUnit,
      };
      persistSaved([next, ...saved]);

      await fetch(`/api/cart/lines/${encodeURIComponent(line.id)}`, { method: "DELETE", cache: "no-store" });
      await refreshFromServer();
    } finally {
      setBusyId(null);
    }
  }

  async function moveToCart(si: SavedItem) {
    try {
      await fetch("/api/cart/lines", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: si.productId,
          optionIds: si.optionIds,
          quantity: si.quantity,
        }),
        cache: "no-store",
      });
      persistSaved(saved.filter((x) => x.id !== si.id));
      await refreshFromServer();
    } catch {}
  }
  function removeSaved(si: SavedItem) { persistSaved(saved.filter((x) => x.id !== si.id)); }

  // When the user chooses a rate in the estimator, persist it server-side
  async function onChangeShipping(rate: ShippingRate | null) {
    setSelectedShipping(rate);
    try {
      await fetch("/api/cart/shipping/choose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(rate ?? {}),
        cache: "no-store",
      });
      // optional: refresh to confirm server echo
      await refreshFromServer();
    } catch {}
  }

  return (
    <main className="cart2">
      <h1 className="sr-only" id="cart-heading">Your Cart</h1>

      <div className="cart2__grid">
        {/* LEFT: items */}
        <section aria-label="Cart items" className="cart2__left">
          {items.length === 0 ? (
            <div className="card text-center">
              <h2 className="m-0">Your cart is empty</h2>
              <p className="muted mt-1">Let’s fix that. Find something awesome to print!</p>
              <a href="/" className="btn primary mt-3">Continue shopping</a>
            </div>
          ) : (
            <ul className="cart2__list">
              {items.map((it) => {
                const unit =
                  typeof it.serverUnitPrice === "number"
                    ? it.serverUnitPrice
                    : typeof it.unitPrice === "number"
                    ? it.unitPrice
                    : 0;
                const lineTotal = unit * (it.quantity || 1);
                const img = cfImgUrl(it.cloudflareImageId);

                return (
                  <li key={it.id} className="cart2__row card">
                    <div className="cart2__rowGrid">
                      {/* thumb */}
                      <div className="cart2__thumb" aria-hidden="true">
                        {img ? (
                          <img
                            className="cart2__thumbImg"
                            src={img}
                            alt={it.name ?? `Product ${it.productId}`}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="cart2__thumbImg" />
                        )}
                      </div>

                      {/* main */}
                      <div className="minw0">
                        <div className="cart2__name">{it.name || `Product ${it.productId}`}</div>
                        <div className="cart2__each">
                          {unit ? `${money(unit, currency)} each` : "$0.00 each"}
                        </div>

                        <div className="cart2__qtyWrap">
                          <label htmlFor={`qty-${it.id}`}>Qty</label>
                          <input
                            id={`qty-${it.id}`}
                            type="number"
                            min={1}
                            value={it.quantity}
                            disabled={busyId === it.id}
                            onChange={(e) => updateQty(it.id, Number(e.currentTarget.value))}
                            className="cart2__qtyInput"
                            aria-label={`Quantity for ${it.name || `Product ${it.productId}`}`}
                          />
                        </div>

                        <button
                          onClick={() => saveForLater(it)}
                          disabled={busyId === it.id}
                          className="link-btn"
                          aria-label={`Save ${it.name || `Product ${it.productId}` } for later`}
                        >
                          Save for later
                        </button>
                      </div>

                      {/* right */}
                      <div className="cart2__rowRight">
                        <div className="cart2__lineTotal">{money(lineTotal, currency)}</div>
                        <button
                          onClick={() => removeLine(it.id)}
                          disabled={busyId === it.id}
                          className="link-dim"
                          aria-label={`Remove ${it.name || `Product ${it.productId}`}`}
                        >
                          {busyId === it.id ? "Removing…" : "Remove"}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Saved for later */}
          {saved.length > 0 && (
            <div className="card mt-6" aria-label="Saved for later">
              <h3 className="m-0">Saved for later</h3>
              <ul className="cart2__list mt-3">
                {saved.map((si) => {
                  const img = cfImgUrl(si.cloudflareImageId);
                  return (
                    <li key={si.id} className="cart2__savedRow">
                      <div className="cart2__rowGrid">
                        <div className="cart2__thumb" aria-hidden="true">
                          {img ? (
                            <img
                              className="cart2__thumbImg"
                              src={img}
                              alt={si.name ?? `Product ${si.productId}`}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="cart2__thumbImg" />
                          )}
                        </div>
                        <div className="minw0">
                          <div className="cart2__name">{si.name || `Product ${si.productId}`}</div>
                          <div className="cart2__each">
                            {typeof si.unitPrice === "number"
                              ? `${money(si.unitPrice, currency)} each`
                              : "Price shown at checkout"}
                          </div>
                          <div className="muted mt-1">Qty: {si.quantity}</div>
                        </div>
                        <div className="cart2__savedActions">
                          <button className="btn primary" onClick={() => moveToCart(si)}>
                            Move to cart
                          </button>
                          <button className="link-dim" onClick={() => removeSaved(si)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        {/* RIGHT: summary with estimator */}
        <aside className="cart2__right" aria-label="Order summary">
          <div className="card">
            <CartSummary
              currency={currency}
              subtotal={subtotal}
              lines={miniLines}
              store={store}
              selectedShipping={selectedShipping}
              onChangeShipping={onChangeShipping}
            />
          </div>
        </aside>
      </div>

      {/* ===== scoped CSS ===== */}
      <style jsx global>{`
        .cart2{max-width:1400px;margin:0 auto;padding:24px 16px}
        .cart2__grid{display:grid;gap:24px}
        @media (min-width:1024px){ .cart2__grid{grid-template-columns:58% 42%} }
        @media (min-width:1280px){ .cart2__grid{grid-template-columns:60% 40%} }
        @media (min-width:1536px){ .cart2__grid{grid-template-columns:62% 38%} }

        .cart2__left{min-width:0}
        .cart2__right{position:sticky;top:96px;align-self:start}
        .cart2__right > .card,
        .cart2__right .order-summary,
        .cart2__right .estimator{width:100%}

        .cart2__right,
        .cart2__right .cartpg__summary,
        .cart2__right .cartpg__summaryCard,
        .cart2__right .cart-summary,
        .cart2__right .order-summary,
        .cart2__right .reviewpg__shipCard,
        .cart2__right .estWrap,
        .cart2__right .estimator,
        .cart2__right .estimator.estimator--compact,
        .cart2__right .estimator.estimator--compact .estimator__rates {
          width: 100% !important;
          max-width: none !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }

        .cart2{--ink:#0f172a;--muted:#64748b}
        .cart2, .cart2 *{font-size:14px;color:var(--ink)}
        .muted{color:var(--muted)}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,.06)}
        .btn{display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 16px;border-radius:10px;border:1px solid transparent;font-weight:700;cursor:pointer}
        .btn.primary{background:#1e40af;color:#fff}
        .btn.primary:hover{filter:brightness(.98)}
        .link-btn{background:none;border:0;padding:0;margin-top:8px;color:#1d4ed8;font-weight:600;cursor:pointer}
        .link-dim{background:none;border:0;padding:0;margin-top:8px;color:#475569;cursor:pointer}
        .minw0{min-width:0}

        .cart2__list{list-style:none;margin:0;padding:0;display:grid;gap:12px}
        .cart2__rowGrid{display:grid;grid-template-columns:96px 1fr auto;gap:12px;align-items:start}
        .cart2__thumb{width:96px;height:96px;background:#f1f5f9;border-radius:8px;overflow:hidden}
        .cart2__thumbImg{width:100%;height:100%;object-fit:cover}
        .cart2__name{font:700 15px/1.15 system-ui,Segoe UI,Roboto,Helvetica,Arial;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .cart2__each{font-size:12px;color:var(--muted);margin-top:2px}
        .cart2__qtyWrap{display:flex;align-items:center;gap:8px;margin-top:8px}
        .cart2__qtyWrap label{font-size:12px;color:#334155}
        .cart2__qtyInput{height:36px;width:80px;border:1px solid #e5e7eb;border-radius:8px;padding:0 8px;box-sizing:border-box;font-size:14px}
        .cart2__rowRight{text-align:right}
        .cart2__lineTotal{font-weight:800}

        .cart2__savedRow{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px}
        .cart2__savedActions{display:flex;flex-direction:column;align-items:end;gap:8px}
      `}</style>
    </main>
  );
}
