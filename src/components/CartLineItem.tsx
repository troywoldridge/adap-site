"use client";

import { useEffect } from "react";
import Image from "next/image";

export type CartItem = {
  id: string;
  productId: number;
  name: string;
  optionIds: number[];
  quantity: number;
  cloudflareImageId: string | null;
  serverUnitPrice?: number;
};

function cfPublicUrl(imageId: string | null): string {
  // Cloudflare Images CDN — account hash from env
  const acc = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH!;
  if (imageId) return `https://imagedelivery.net/${acc}/${imageId}/public`;
  // design choice: tiny transparent PNG placeholder (no external fallbacks)
  return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
}

export default function CartLineItem({
  item,
  onQtyChange,
  onUnitPrice,
  onRemove,
  priority = false,
}: {
  item: CartItem;
  onQtyChange: (id: string, qty: number) => void;
  onUnitPrice: (id: string, unit: number) => void;
  onRemove: (id: string) => void;
  priority?: boolean;
}) {
  // Fetch live price (SinaLite pricing API) whenever options/qty change
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const res = await fetch(`/api/sinalite/price/${item.productId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ optionIds: item.optionIds, quantity: item.quantity }),
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => null);

      if (!res || !res.ok) return;
      const data = (await res.json().catch(() => null)) as
        | { ok: true; unitPrice: number }
        | null;
      if (!data || !("ok" in data) || !data.ok) return;
      const unit = Number((data as any).unitPrice ?? 0);
      if (Number.isFinite(unit)) onUnitPrice(item.id, unit);
    })();
    return () => controller.abort();
  }, [item.id, item.productId, item.quantity, JSON.stringify(item.optionIds), onUnitPrice]);

  const unitDisplay = (n?: number) =>
    (n ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD" }); // UI currency will be reconciled in summary

  return (
    <div
      className="cart-line | grid gap-4"
      style={{ gridTemplateColumns: "120px 1fr auto", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #eee" }}
    >
      <div style={{ position: "relative", width: 120, height: 90, borderRadius: 8, overflow: "hidden", background: "#f5f5f5" }}>
        <Image
          src={cfPublicUrl(item.cloudflareImageId)}
          alt={item.name}
          fill
          sizes="120px"
          style={{ objectFit: "cover" }}
          priority={priority}
        />
      </div>

      <div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <strong>{item.name}</strong>
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center" }}>
          <label htmlFor={`qty-${item.id}`} style={{ fontSize: 14, color: "#666" }}>
            Qty
          </label>
          <input
            id={`qty-${item.id}`}
            type="number"
            min={1}
            max={9999}
            value={item.quantity}
            onChange={(e) => onQtyChange(item.id, Math.max(1, Math.min(9999, Number(e.target.value) || 1)))}
            style={{ width: 80, padding: "6px 8px", borderRadius: 8, border: "1px solid #ddd" }}
          />
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>
          {/* unit price shown by parent subtotal; display last known server seed for per-line clarity */}
          {unitDisplay(item.serverUnitPrice)}
        </div>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${item.name}`}
          style={{
            background: "transparent",
            border: "1px solid #e11d48",
            color: "#e11d48",
            padding: "6px 10px",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
