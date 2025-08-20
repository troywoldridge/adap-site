// src/app/cart/CartPageClient.tsx
"use client";

import { useCallback, useMemo, useState } from "react";
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

  // Seed prices from server so subtotal shows immediately; live hook will update them
  const [priceByLine, setPriceByLine] = useState<Record<string, number>>(() => {
    const seed: Record<string, number> = {};
    for (const it of initialItems) {
      if (typeof it.serverUnitPrice === "number" && Number.isFinite(it.serverUnitPrice)) {
        seed[it.id] = it.serverUnitPrice;
      }
    }
    return seed;
  });

  const persistQty = useCallback(async (id: string, qty: number) => {
    try {
      const r = await fetch(`/api/cart/lines/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quantity: qty }),
        cache: "no-store",
      });
      return r.ok;
    } catch {
      return false;
    }
  }, []);

  const onQtyChange = useCallback(
    async (id: string, qty: number) => {
      const prev = items.find((it) => it.id === id)?.quantity ?? 1;
      if (prev === qty) return;

      setItems((curr) => curr.map((it) => (it.id === id ? { ...it, quantity: qty } : it)));
      const ok = await persistQty(id, qty);
      if (!ok) {
        setItems((curr) => curr.map((it) => (it.id === id ? { ...it, quantity: prev } : it)));
      }
    },
    [items, persistQty]
  );

  const onUnitPrice = useCallback((id: string, unit: number) => {
    setPriceByLine((prev) => (prev[id] === unit ? prev : { ...prev, [id]: unit }));
  }, []);

  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const unit = priceByLine[it.id] ?? 0;
      const qty = it.quantity ?? 1;
      return sum + unit * qty;
    }, 0);
  }, [items, priceByLine]);

  const summaryLines = useMemo(
    () =>
      items.map((i) => ({
        productId: i.productId,
        optionIds: i.optionIds,
        quantity: i.quantity,
      })),
    [items]
  );

  return (
    <>
      <div className="cart-left">
        <h1 className="cart-title">Your Cart</h1>
        {items.map((item, idx) => (
          <CartLineItem
            key={item.id}
            item={item}
            store={store}
            onQtyChange={onQtyChange}
            onUnitPrice={onUnitPrice}
            priority={idx === 0}  // ✅ idx is defined here
          />
        ))}
      </div>

      <div className="cart-right">
        <CartSummary
          lines={summaryLines}
          currency={currency}
          subtotal={subtotal}
          store={store}
        />
      </div>
    </>
  );
}
