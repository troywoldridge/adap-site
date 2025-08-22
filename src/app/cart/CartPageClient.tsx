"use client";

import { useMemo, useState, useCallback } from "react";
import CartLineItem, { type CartItem } from "@/components/CartLineItem";
import CartSummary from "@/components/CartSummary";

export default function CartPageClient({
  initialItems,
  currency,
  store = "US",
}: {
  initialItems: CartItem[];
  currency: "USD" | "CAD";
  store?: "US" | "CA";
}) {
  const [items, setItems] = useState<CartItem[]>(initialItems);
  const [priceByLine, setPriceByLine] = useState<Record<string, number>>({});

  // quantity change → persist to API + update state
  const onQtyChange = useCallback((id: string, qty: number) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, quantity: qty } : it)));
    // best-effort server persist (PATCH)
    void fetch(`/api/cart/lines/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quantity: qty }),
      cache: "no-store",
    }).catch(() => {});
  }, []);

  // live unit price reported by line item (from /api/sinalite/price per docs)
  const onUnitPrice = useCallback((id: string, unit: number) => {
    setPriceByLine(prev => (prev[id] === unit ? prev : { ...prev, [id]: unit }));
  }, []);

  // remove line → call API then update UI
  const onRemove = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/cart/lines/${id}`, { method: "DELETE", cache: "no-store" });
      if (!res.ok) {
        // soft-fail: still remove locally so the page feels responsive
        // in practice you'd show a toast
      }
    } catch {
      // ignore network error but still proceed locally
    } finally {
      setItems(prev => prev.filter(it => it.id !== id));
      setPriceByLine(prev => {
        const { [id]: _drop, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  // subtotal based on reported unit price (fallback to serverUnitPrice)
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const unit = priceByLine[it.id] ?? it.serverUnitPrice ?? 0;
      const qty = it.quantity ?? 1;
      return sum + unit * qty;
    }, 0);
  }, [items, priceByLine]);

  return (
    <div className="cart | grid gap-6" style={{ gridTemplateColumns: "1fr 380px" }}>
      <div className="cart-left">
        <h1 className="cart-title">Your Cart</h1>
        {items.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <ul className="cart-lines" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {items.map((item, idx) => (
              <li key={item.id} className="cart-line">
                <CartLineItem
                  item={item}
                  onQtyChange={onQtyChange}
                  onUnitPrice={onUnitPrice}
                  onRemove={onRemove}
                  priority={idx === 0}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="cart-right">
        <CartSummary
          lines={items.map(i => ({
            productId: i.productId,
            optionIds: i.optionIds,
            quantity: i.quantity,
          }))}
          currency={currency}
          subtotal={subtotal}
          store={store}
        />
      </aside>
    </div>
  );
}
