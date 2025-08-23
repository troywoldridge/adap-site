"use client";

import { useEffect, useMemo, useState } from "react";
import CartSummary from "@/components/CartSummary";
import type { ShippingRate } from "@/components/CartShippingEstimator";

/* ---------- Types ---------- */
type AnyItem = {
  id: string;
  productId: number;
  name?: string | null;
  optionIds: number[];
  quantity: number;
  cloudflareImageId?: string | null;
  serverUnitPrice?: number; // from server
  unitPrice?: number;       // client override
};

type SavedItem = {
  id: string; // local id for saved list
  productId: number;
  name?: string | null;
  optionIds: number[];
  quantity: number;
  cloudflareImageId?: string | null;
  unitPrice?: number; // snapshot at time of save (we use Sinalite on cart)
};

type Props = {
  initialItems: AnyItem[];
  currency: "USD" | "CAD";
  store: "US" | "CA";
  initialShipping: ShippingRate | null;
};

/* ---------- Helpers ---------- */
const money = (n: number, currency: "USD" | "CAD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n || 0);

// Cloudflare Image Delivery (keeps things fast + cached at the edge)
function cfImgUrl(id?: string | null) {
  if (!id) return null;
  const acct = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH || "pJ0fKvjCAbyoF8aD0BGu8Q";
  return `https://imagedelivery.net/${acct}/${id}/public`;
}

const SAVED_KEY = "ADAP_SAVED_V1";

/* ---------- Component ---------- */
export default function CartPageClient({ initialItems, currency, store, initialShipping }: Props) {
  const [items, setItems] = useState<AnyItem[]>(initialItems || []);
  const [selectedShipping, setSelectedShipping] = useState<ShippingRate | null>(initialShipping);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedItem[]>([]);

  // Load saved list (localStorage; no schema changes needed)
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
    [items]
  );

  const miniLines = useMemo(
    () =>
      (items || []).map((it) => ({
        productId: it.productId,
        optionIds: it.optionIds || [],
        quantity: it.quantity || 1,
      })),
    [items]
  );

  async function refreshFromServer() {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const srvItems =
        (json?.cart?.items as AnyItem[])?.map((it) => ({
          ...it,
          serverUnitPrice:
            typeof it.unitPrice === "number" ? it.unitPrice : it.serverUnitPrice,
        })) || [];
      setItems(srvItems);

      const srvShip = json?.cart?.shipping;
      if (srvShip && typeof srvShip?.cost === "number") {
        setSelectedShipping({
          carrier: srvShip.carrier,
          method: srvShip.method,
          cost: srvShip.cost,
          days: srvShip.days ?? null,
          currency: srvShip.currency,
        });
      }
    } catch {}
  }

  async function removeLine(lineId: string) {
    setBusyId(lineId);
    try {
      await fetch(`/api/cart/lines/${encodeURIComponent(lineId)}`, { method: "DELETE" });
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
      });
      await refreshFromServer();
    } finally {
      setBusyId(null);
    }
  }

  // Save a cart line into local saved list, remove from cart
  async function saveForLater(line: AnyItem) {
    setBusyId(line.id);
    try {
      // snapshot unit price so we can display it in Saved (cart will re-price when moved back)
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

      // remove from cart
      await fetch(`/api/cart/lines/${encodeURIComponent(line.id)}`, { method: "DELETE" });
      await refreshFromServer();
    } finally {
      setBusyId(null);
    }
  }

  // Move a saved item back into cart (server will merge same product/options)
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
      });
      // remove from saved
      persistSaved(saved.filter((x) => x.id !== si.id));
      await refreshFromServer();
    } catch {}
  }

  function removeSaved(si: SavedItem) {
    persistSaved(saved.filter((x) => x.id !== si.id));
  }

  return (
    <main className="cartpg" aria-labelledby="cart-heading">
      <h1 id="cart-heading" className="sr-only">Your Cart</h1>

      <div className="cartpg__grid">
        {/* LEFT: items */}
        <section aria-label="Cart items">
          {items.length === 0 ? (
            <div className="empty-card">
              <h2 style={{ margin: 0 }}>Your cart is empty</h2>
              <p>Let’s fix that. Find something awesome to print!</p>
              <a href="/" className="btn primary">Continue shopping</a>
            </div>
          ) : (
            <ul className="cartpg__list">
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
                  <li key={it.id} className="cartpg__row">
                    <div className="cartpg__rowGrid">
                      <div className="cartpg__thumb" aria-hidden="true">
                        {img ? (
                          <img
                            className="cartpg__thumbImg"
                            src={img}
                            alt={it.name ?? `Product ${it.productId}`}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="cartpg__thumbImg" aria-hidden="true" />
                        )}
                      </div>

                      <div>
                        <div className="cartpg__name">{it.name || `Product ${it.productId}`}</div>
                        <div className="cartpg__each">
                          {unit ? `${money(unit, currency)} each` : "$0.00 each"}
                        </div>
                        <div className="cartpg__qtyWrap">
                          <label htmlFor={`qty-${it.id}`}>Qty</label>
                          <input
                            id={`qty-${it.id}`}
                            type="number"
                            min={1}
                            value={it.quantity}
                            disabled={busyId === it.id}
                            onChange={(e) => updateQty(it.id, Number(e.currentTarget.value))}
                            className="cartpg__qtyInput"
                            aria-label={`Quantity for ${it.name || `Product ${it.productId}`}`}
                          />
                        </div>

                        <button
                          onClick={() => saveForLater(it)}
                          disabled={busyId === it.id}
                          className="cartpg__save"
                          aria-label={`Save ${it.name || `Product ${it.productId}` } for later`}
                        >
                          Save for later
                        </button>
                      </div>

                      <div className="cartpg__rowRight">
                        <div className="cartpg__lineTotal">{money(lineTotal, currency)}</div>
                        <button
                          onClick={() => removeLine(it.id)}
                          disabled={busyId === it.id}
                          className="cartpg__remove"
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
            <div className="saved-card" aria-label="Saved for later">
              <h3>Saved for later</h3>
              <ul className="saved-list">
                {saved.map((si) => {
                  const img = cfImgUrl(si.cloudflareImageId);
                  return (
                    <li key={si.id} className="saved-row">
                      <div className="saved-row__grid">
                        <div className="saved-thumb" aria-hidden="true">
                          {img ? (
                            <img
                              className="saved-thumb__img"
                              src={img}
                              alt={si.name ?? `Product ${si.productId}`}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="saved-thumb__img" aria-hidden="true" />
                          )}
                        </div>
                        <div className="saved-main">
                          <div className="saved-name">{si.name || `Product ${si.productId}`}</div>
                          <div className="saved-each">
                            {typeof si.unitPrice === "number"
                              ? `${money(si.unitPrice, currency)} each`
                              : "Price shown at checkout"}
                          </div>
                          <div className="saved-opts">Qty: {si.quantity}</div>
                        </div>
                        <div className="saved-actions">
                          <button className="btn primary" onClick={() => moveToCart(si)}>
                            Move to cart
                          </button>
                          <button className="link-btn" onClick={() => removeSaved(si)}>
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
        <aside className="cartpg__summary" aria-label="Order summary">
          <div className="cartpg__summaryCard cart-summary">
            <CartSummary
              currency={currency}
              subtotal={subtotal}
              lines={miniLines}
              store={store}
              selectedShipping={selectedShipping}
              onChangeShipping={(r) => setSelectedShipping(r)}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
