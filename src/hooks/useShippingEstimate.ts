"use client";

import { useCallback, useMemo, useState } from "react";

export type ShippingLine = {
  productId: number;
  optionIds: number[];
  quantity: number;
};

export type ShippingRate = {
  service: string;
  eta: string;
  cost: number;
  currency: "USD" | "CAD" | string;
};

type Input = {
  country: string;
  state: string;
  zip: string;
  store?: "US" | "CA";
  items: ShippingLine[];
};

export function useShippingEstimate() {
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [error, setError] = useState<string | null>(null);

  const estimate = useCallback(async (input: Input) => {
    setLoading(true);
    setError(null);
    setRates([]);

    const body = {
      shipCountry: input.country.toUpperCase(),
      shipState: input.state.toUpperCase(),
      shipZip: String(input.zip),
      store: input.store ?? "US",
      // Filter out invalid lines here too, so we don't hit a 400 upstream:
      items: (input.items || [])
        .map((l) => ({
          productId: Number(l.productId),
          optionIds: Array.isArray(l.optionIds)
            ? l.optionIds.map(Number).filter((n) => Number.isFinite(n))
            : [],
          quantity: Number(l.quantity) > 0 ? Number(l.quantity) : 1,
        }))
        .filter((l) => l.productId && l.optionIds.length > 0 && l.quantity > 0),
    };

    try {
      const res = await fetch("/api/cart/estimate-shipping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });

      const json = (await res.json().catch(() => ({}))) as
        | { ok: true; rates: ShippingRate[] }
        | { ok: false; error: string; detail?: any };

      if (!res.ok || !("ok" in json) || !json.ok) {
        setError(
          (json as any)?.error ||
            `Shipping estimate failed (${res.status} ${res.statusText})`
        );
        return;
      }

      setRates(json.rates || []);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  return useMemo(
    () => ({ loading, rates, error, estimate }),
    [loading, rates, error, estimate]
  );
}
