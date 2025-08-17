// src/lib/cart-client.ts
"use client";

import { useCallback, useEffect, useState } from "react";

export type CartItem = {
  id: string;
  productId: number;
  name?: string | null;
  quantity: number;
  optionIds: number[] | null;
  image?: string | null;
  // pricing fields (optional if you don’t compute them yet)
  currency?: "USD" | "CAD";
  unitPrice?: number | null;
  lineTotal?: number | null;
  numSides?: number | null;
  artwork?: { side: number; url: string }[]; // if you populate later
};

export type CartState = {
  cartId: string;
  currency: "USD" | "CAD";
  items: CartItem[];
  subtotal: number; // computed or 0
};

const DEFAULT_CART: CartState = {
  cartId: "",
  currency: "USD",
  items: [],
  subtotal: 0,
};

export function useCart() {
  const [cart, setCart] = useState<CartState>(DEFAULT_CART);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      const text = await res.text();
      let data: CartState = DEFAULT_CART;
      try {
        data = JSON.parse(text);
      } catch {
        // keep default; avoid crashing on HTML error pages
      }
      setCart(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const addToCart = useCallback(async (payload: {
    productId: number;
    qty: number;
    optionIdsByGroup?: Record<string, string | number>;
    price?: number;
    currency?: string;
  }) => {
    const res = await fetch("/api/cart/add", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    // ensure server sent JSON (avoid “Unexpected end of JSON input”)
    await res.text();
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return { cart, loading, refresh, addToCart };
}
