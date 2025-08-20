// src/hooks/useSinalitePrice.ts
"use client";
import { useCallback, useEffect, useState } from "react";

export function useSinalitePrice(productId: number, optionIds: number[], store: "US" | "CA" = "US") {
  const [data, setData] = useState<{ price: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!productId || !optionIds?.length) return;
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`/api/sinalite/price/${productId}?store=${store}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productOptions: optionIds }),
        cache: "no-store",
      });
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error || "Price error");
      const p = Number(j?.data?.price ?? 0);
      setData({ price: isFinite(p) ? p : 0 });
    } catch (e: any) { setErr(e?.message ?? "Unknown"); }
    finally { setLoading(false); }
  }, [productId, optionIds, store]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error: err, refresh };
}
