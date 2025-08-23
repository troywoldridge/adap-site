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
  serverUnitPrice?: number;
  unitPrice?: number;
};

type Props = {
  initialItems: AnyItem[];
  currency: "USD" | "CAD";
  store: "US" | "CA";
  initialShipping: ShippingRate | null;
};

function money(n: number, currency: "USD" | "CAD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    n || 0
  );
}

export default function CartPageClient({
  initialItems,
  currency,
  store,
  initialShipping,
}: Props) {
  const [items, setItems] = useState<AnyItem[]>(initialItems || []);
  const [selectedShipping, setSelectedShipping] = useState<ShippingRate | null>(
    initialShipping || null
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const subtotal = useMemo(() => {
    return (items || []).reduce((sum, it) => {
      const unit =
        typeof it.serverUnitPrice === "number"
          ? it.serverUnitPrice
          : typeof it.unitPrice === "number"
          ? it.unitPrice
          : 0;
      return sum + unit * (it.quantity || 1);
    }, 0);
  }, [items]);

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
    } catch {
      /* ignore */
    }
  }

  async function removeLine(lineId: string) {
    setBusyId(lineId);
    try {
      await fetch(`/api/cart/lines/${encodeURIComponent(lineId)}`, {
        method: "DELETE",
      });
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

  // Persist selected shipping to the server carts.selected_shipping
  async function persistShipping(rate: ShippingRate | null) {
    setSelectedShipping(rate);
    if (!rate) return;
    try {
      await fetch("/api/cart/shipping/choose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          carrier: rate.carrier,
          method: rate.method,
          cost: rate.cost,
          days: rate.days ?? null,
          currency: rate.currency,
          country: store === "CA" ? "CA" : "US",
          state: "",
          zip: "",
        }),
      });
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="cartpg">
      <div className="cartpg__grid">
        {/* LEFT: items */}
        <section>
          <h1 style={{ margin: "0 0 12px" }}>Your Cart</h1>

          {items.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            <ul style={{ padding: 0, listStyle: "none", margin: 0 }}>
              {items.map((it) => {
                const unit =
                  typeof it.serverUnitPrice === "number"
                    ? it.serverUnitPrice
                    : typeof it.unitPrice === "number"
                    ? it.unitPrice
                    : 0;
                const lineTotal = unit * (it.quantity || 1);

                return (
                  <li key={it.id} className="cartpg__row">
                    <div className="cartpg__rowGrid">
                      <div className="cartpg__thumb" />
                      <div>
                        <div className="cartpg__name">
                          {it.name || `Product ${it.productId}`}
                        </div>
                        <div className="cartpg__each">
                          {unit ? `${money(unit, currency)} each` : "$0.00 each"}
                        </div>
                        <div className="cartpg__qtyWrap">
                          <label>Qty</label>
                          <input
                            type="number"
                            min={1}
                            value={it.quantity}
                            disabled={busyId === it.id}
                            onChange={(e) =>
                              updateQty(it.id, Number(e.currentTarget.value))
                            }
                            className="cartpg__qtyInput"
                          />
                        </div>
                      </div>

                      <div className="cartpg__rowRight">
                        <div className="cartpg__lineTotal">
                          {money(lineTotal, currency)}
                        </div>
                        <button
                          onClick={() => removeLine(it.id)}
                          disabled={busyId === it.id}
                          className="cartpg__remove"
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
        </section>

        {/* RIGHT: summary with estimator */}
        <aside className="cartpg__summary">
          <div className="cartpg__summaryCard cart-summary">
            <CartSummary
              currency={currency}
              subtotal={subtotal}
              lines={miniLines}
              store={store}
              selectedShipping={selectedShipping}
              onChangeShipping={persistShipping}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
