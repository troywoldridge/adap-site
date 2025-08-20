// src/components/product/ProductBuyBox.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSinalitePrice } from "@/hooks/useSinalitePrice";

type OG = { id?: number|string; name: string; group?: string; options: { id: number; name: string }[] };

export default function ProductBuyBox({
  productId,
  productName,
  optionGroups,
  store = "US",
}: {
  productId: number;
  productName: string;
  optionGroups: OG[];
  store?: "US" | "CA";
}) {
  // selections keyed by group index (safe across unknown schemas)
  const [sel, setSel] = useState<number[]>(() => optionGroups.map(g => g.options?.[0]?.id).filter(Boolean));
  const [qty, setQty] = useState(1);
  const router = useRouter();

  const selectedOptionIds = useMemo(() => sel.filter((x): x is number => Number.isFinite(x as number)), [sel]);

  const { data, loading } = useSinalitePrice(productId, selectedOptionIds, store);
  const unit = useMemo(() => Number(data?.price ?? 0), [data]);
  const extended = useMemo(() => unit * (qty || 1), [unit, qty]);

  function onChangeGroup(idx: number, val: string) {
    const id = Number(val);
    setSel(prev => prev.map((v, i) => (i === idx ? id : v)));
  }

  async function addToCart() {
    const r = await fetch("/api/cart/lines", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId,
        name: productName,
        optionIds: selectedOptionIds,
        quantity: qty,
      }),
      cache: "no-store",
    });
    if (!r.ok) return;
    router.push("/cart");
  }

  return (
    <div className="buybox">
      <div className="buybox-groups">
        {optionGroups.map((g, idx) => (
          <label key={idx} className="buybox-row">
            <span className="buybox-label">{g.name || g.group || `Option ${idx+1}`}</span>
            <select
              className="input"
              value={sel[idx] ?? ""}
              onChange={(e) => onChangeGroup(idx, e.target.value)}
            >
              {g.options?.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="buybox-qty">
        <span className="buybox-label">Quantity</span>
        <div className="qty-ctrl">
          <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
          <span className="qty-display">{qty}</span>
          <button className="qty-btn" onClick={() => setQty(q => Math.min(9999, q + 1))}>+</button>
        </div>
      </div>

      <div className="buybox-price">
        <div className="price-line">
          <span>Price</span>
          <span className="mono">{loading ? "…" : `$${unit.toFixed(2)}`}</span>
        </div>
        <div className="price-line">
          <span>Subtotal</span>
          <span className="mono">{loading ? "…" : `$${extended.toFixed(2)}`}</span>
        </div>
      </div>

      <button className="btn primary w-full" onClick={addToCart} disabled={loading || !selectedOptionIds.length}>
        Add to Cart
      </button>
    </div>
  );
}
