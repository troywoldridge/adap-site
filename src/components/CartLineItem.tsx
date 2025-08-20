"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import ArtworkUpload, { ArtworkFile } from "./ArtworkUpload";
import { useSinalitePrice } from "@/hooks/useSinalitePrice";

// in CartLineItem.tsx (or your shared CF helper)
function cfUrlFromId(id?: string | null, variant = "public"): string {
  const hash =
    process.env.NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH ||
    process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH || // ← your current key
    "";

  if (!id || !hash) {
    // visible placeholder so you can see it in DevTools if something’s still off
    return `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='100%' height='100%' fill='#eee'/><text x='8' y='52' font-family='monospace' font-size='10' fill='#666'>Missing CF ID/HASH</text></svg>`
    )}`;
  }
  return `https://imagedelivery.net/${hash}/${id}/${variant}`;
}

export type CartItem = {
  id: string;
  productId: number;
  name: string;
  optionIds: number[];
  quantity: number;
  cloudflareImageId?: string | null; // CF image ID
  serverUnitPrice?: number;
};

export default function CartLineItem({
  item,
  store = "US",
  variant = "public",
  onQtyChange,
  onUnitPrice,
  priority = false, 
}: {
  item: CartItem;
  store?: "US" | "CA";
  variant?: string;
  onQtyChange?: (id: string, qty: number) => void;
  onUnitPrice?: (id: string, unit: number) => void;
  priority?: boolean; 
}) {
  const [art, setArt] = useState<ArtworkFile[]>([]);
  const { data, loading } = useSinalitePrice(item.productId, item.optionIds, store);

  const unit = useMemo(() => {
    const live = Number(data?.price ?? NaN);
    if (Number.isFinite(live)) return live;
    const seed = Number(item.serverUnitPrice ?? NaN);
    return Number.isFinite(seed) ? seed : 0;
  }, [data, item.serverUnitPrice]);

  const lineTotal = useMemo(() => unit * (item.quantity || 1), [unit, item.quantity]);

  useEffect(() => {
    if (Number.isFinite(unit)) onUnitPrice?.(item.id, unit);
  }, [unit, item.id, onUnitPrice]);

  const thumbSrc = cfUrlFromId(item.cloudflareImageId, variant);

  return (
    <article className="cart-line">
      <div className="cart-line-head">
        <div className="cart-line-left">
          <div className="thumb-wrap">
            <Image
              src={thumbSrc}
              alt={item.name}
              width={72}
              height={72}
              className="thumb"
              unoptimized   // no Next.js domain config needed
              priority={false}
            />
          </div>
          <div className="cart-line-text">
            <div className="cart-line-name">{item.name}</div>
            <div className="cart-line-meta">
              Qty&nbsp;
              <button className="qty-btn" onClick={() => onQtyChange?.(item.id, Math.max(1, item.quantity - 1))}>−</button>
              <span className="qty-display">{item.quantity}</span>
              <button className="qty-btn" onClick={() => onQtyChange?.(item.id, Math.min(9999, item.quantity + 1))}>+</button>
              <span className="price-each">• {loading ? "…" : `$${unit.toFixed(2)}`} each</span>
            </div>
          </div>
        </div>
        <div className="cart-line-total">{loading ? "…" : `$${lineTotal.toFixed(2)}`}</div>
      </div>

      <div className="artwork-row">
        <div className="artwork-title">Artwork</div>
        <div className="artwork-actions">
          <ArtworkUpload cartId={"current"} lineId={item.id} onUploaded={(a) => setArt((p) => [...p, a])} label="Upload Artwork" />
        </div>
      </div>
    </article>
  );
}
