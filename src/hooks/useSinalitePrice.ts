import { useEffect, useMemo, useState } from "react";

export function useSinalitePrice({ productId, optionIds, store }: {
  productId: number; optionIds: number[]; store: "US" | "CA";
}) {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const key = useMemo(() => JSON.stringify({ productId, optionIds: [...optionIds].sort(), store }), [productId, optionIds, store]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/sinalite/price", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId, optionIds, store }),
        });
        const json = await r.json();
        if (!alive) return;
        setPrice(json?.ok ? Number(json.unitPrice) : null);
      } catch {
        if (alive) setPrice(null);
      } finally {
        if (alive) setLoading(false);
      }
    }, 200); // debounce

    return () => { alive = false; clearTimeout(t); };
  }, [key, productId, optionIds, store]);

  return { price, loading };
}
