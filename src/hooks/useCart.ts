// src/hooks/useCart.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Minimal shape for a cart line we can render in a badge, totals, etc. */
export type CartItem = {
  id: string;
  productId?: number;
  name?: string;
  quantity: number;
  unitPrice?: number; // cents or dollars — not used by badge, but handy
  imageUrl?: string | null;
};

/** Internal: a simple event bus so any part of the app can say “cart changed” */
const bus: EventTarget =
  (globalThis as any).__ADAP_CART_BUS__ ?? ((globalThis as any).__ADAP_CART_BUS__ = new EventTarget());

export function emitCartChanged() {
  bus.dispatchEvent(new Event("cart:changed"));
}

/** Try to normalize whatever your /api/cart returns into CartItem[] */
function normalizeToItems(payload: any): CartItem[] {
  // Common shapes we’ve seen in your project:
  // 1) { ok: true, cart: {...}, lines: [...] }
  // 2) { cart: { lines: [...] } }
  // 3) { lines: [...] }
  const lines =
    payload?.lines ??
    payload?.cart?.lines ??
    payload?.cartLines ??
    payload?.data?.lines ??
    [];

  if (!Array.isArray(lines)) return [];

  return lines
    .map((l: any) => {
      const qty = Number(l?.quantity ?? l?.qty ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) return null;

      // Try a few possible field names
      return {
        id: String(l?.id ?? l?.lineId ?? crypto.randomUUID()),
        productId: Number(l?.productId ?? l?.product_id),
        name: String(l?.name ?? l?.productName ?? l?.displayName ?? ""),
        quantity: qty,
        unitPrice: Number(l?.unitPrice ?? l?.price ?? l?.unit_price ?? 0),
        imageUrl:
          (l?.imageUrl ??
            l?.thumbUrl ??
            l?.image ??
            // optional Cloudflare fallback if you store cf id:
            (l?.cloudflare_image_id
              ? `https://imagedelivery.net/${process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH}/${l.cloudflare_image_id}/thumbnail`
              : null)) || null,
      } as CartItem;
    })
    .filter(Boolean) as CartItem[];
}

async function fetchCartOnce(signal?: AbortSignal): Promise<CartItem[]> {
  // Prefer a single canonical endpoint. Your project shows /api/cart in logs.
  const res = await fetch("/api/cart", { method: "GET", signal, credentials: "include" });
  if (!res.ok) throw new Error(`Cart fetch failed: ${res.status}`);
  const data = await res.json();
  return normalizeToItems(data);
}

export function useCart(pollMs: number = 0) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setErr] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    try {
      setIsLoading(true);
      setErr(null);
      const next = await fetchCartOnce(ctl.signal);
      setItems(next);
    } catch (e: any) {
      if (e?.name !== "AbortError") setErr(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // initial load
    refresh();

    // revalidate when any part of app emits cart:changed
    const onChanged = () => refresh();
    bus.addEventListener("cart:changed", onChanged);

    // optional polling
    if (pollMs > 0) {
      pollRef.current = setInterval(refresh, pollMs);
    }

    return () => {
      bus.removeEventListener("cart:changed", onChanged);
      abortRef.current?.abort();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refresh, pollMs]);

  const itemCount = useMemo(() => items.reduce((sum, it) => sum + (it.quantity || 0), 0), [items]);

  return { items, itemCount, isLoading, error, refresh };
}
