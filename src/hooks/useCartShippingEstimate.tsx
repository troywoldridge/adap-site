// src/hooks/useCartShippingEstimate.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

export type EstimateLine = {
  productId: number;
  optionIds: number[];
  quantity: number;
};

export type ShippingQuote = {
  carrier: string;
  service: string;
  etaDays?: number | null;
  cost: number;
  currency: "USD" | "CAD";
};

type EstimateResponse =
  | { ok: true; quotes: ShippingQuote[] }
  | { ok: false; error: string };

export function useCartShippingEstimate(lines?: EstimateLine[]) {
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<ShippingQuote[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Make the dep stable
  const payload = useMemo(() => {
    if (Array.isArray(lines) && lines.length) {
      return { items: lines };
    }
    return {}; // server will read the current cart
  }, [JSON.stringify(lines ?? [])]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/cart/estimate-shipping", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as EstimateResponse;
        if (!res.ok || !("ok" in json) || !json.ok) {
          throw new Error((json as any)?.error || `shipping estimate failed`);
        }
        if (!cancelled) setQuotes(json.quotes);
      } catch (err: unknown) {
        if (!cancelled) {
          setQuotes(null);
          setError(err instanceof Error ? err.message : "shipping estimate error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [payload]);

  return { loading, quotes, error };
}

export default useCartShippingEstimate;
