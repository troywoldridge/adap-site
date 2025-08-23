"use client";

import { useState, useCallback } from "react";

export type CartLine = {
  productId: number;
  optionIds: number[];
  quantity: number;
};

export type ShippingRate = {
  carrier: string;
  method: string;
  cost: number;
  days: number | null;
  currency: "USD" | "CAD";
};

export function useCartShippingEstimate() {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimate = useCallback(
    async ({
      country,
      state,
      zip,
      store,
      items,
    }: {
      country: "US" | "CA";
      state: string;
      zip: string;
      store?: "US" | "CA";
      items: CartLine[];
    }) => {
      setLoading(true);
      setError(null);
      setRates([]);

      try {
        const res = await fetch("/api/cart/estimate-shipping", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            shipCountry: country,
            shipState: state,
            shipZip: zip,
            items,
            store: store || country,
          }),
        });

        const json = (await res.json()) as
          | { ok: true; rates: ShippingRate[] }
          | { ok: false; error: string; detail?: unknown };

        if (!res.ok || !("ok" in json) || !json.ok) {
          throw new Error((json as any)?.error || "Failed to fetch rates");
        }

        const normalized: ShippingRate[] = (json.rates || []).map((r) => ({
          carrier: r.carrier || "",
          method: r.method || "",
          cost: Number(r.cost) || 0,
          days: typeof r.days === "number" ? r.days : null,
          currency: r.currency === "CAD" ? "CAD" : "USD",
        }));

        setRates(normalized);
        return normalized;
      } catch (err: any) {
        const msg = String(err?.message || err);
        setError(msg);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { rates, loading, error, estimate };
}
