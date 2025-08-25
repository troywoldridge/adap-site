"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  productId: number;
  optionIds: number[];   // MUST include the SinaLite qty valueId (per docs)
  quantity: number;      // UI quantity; server pricing uses the qty optionId
  store: "US" | "CA";
  label?: string;
  className?: string;
  onAdded?: (lineId: string) => void;
};

export default function AddToCartButton({
  productId,
  optionIds,
  quantity,
  store,
  label = "Add & Upload Artwork",
  className,
  onAdded,
}: Props) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      className={className ?? "inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 font-bold text-white hover:bg-blue-800 disabled:opacity-50"}
      onClick={async () => {
        try {
          setBusy(true);
          const res = await fetch("/api/cart/add", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ productId, optionIds, quantity, store }),
          });
          const json = await res.json();
          if (!res.ok || !json?.ok) {
            console.error("Add to cart failed:", json);
            return;
          }
          const lineId = json?.lineId as string | undefined;
          if (onAdded && lineId) onAdded(lineId);

          // Redirect to the upload step BEFORE cart (as requested)
          if (lineId) {
            r.push(`/product/${productId}/upload-artwork?lineId=${encodeURIComponent(lineId)}`);
          } else {
            // Fallback: go to cart if we didn't get lineId (shouldn’t happen)
            r.push("/cart");
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Adding…" : label}
    </button>
  );
}
