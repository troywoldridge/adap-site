// src/components/CartCreditsRow.tsx
"use client";
import * as React from "react";

function money(cents: number, currency: "USD" | "CAD") {
  const dollars = (cents || 0) / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(dollars);
}

export default function CartCreditsRow({
  currency = "USD",
  onChanged,
}: {
  currency?: "USD" | "CAD";
  onChanged?: () => void;
}) {
  const [loading, setLoading] = React.useState(true);
  const [amountCents, setAmountCents] = React.useState(0);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setErr(null);
      setLoading(true);
      const res = await fetch("/api/cart/credits", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed");
      setAmountCents(Number(data.amountCents || 0));
    } catch (e: any) {
      setErr(e?.message || "Failed to load credits");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const clear = async () => {
    const yes = confirm("Remove applied loyalty credits from this cart?");
    if (!yes) return;
    await fetch("/api/cart/credits", { method: "DELETE", credentials: "include" });
    await load();
    onChanged?.();
  };

  if (loading) return null;
  if (amountCents <= 0) return null;

  return (
    <div className="flex items-center justify-between py-2 text-emerald-700">
      <span className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ring-emerald-200">
          Loyalty credits
        </span>
        <button
          onClick={() => void clear()}
          className="text-xs text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
        >
          Remove
        </button>
      </span>
      <span>−{money(amountCents, currency)}</span>
    </div>
  );
}
