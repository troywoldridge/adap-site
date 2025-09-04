"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  lineId: string;
  productId: number;
  side: number;        // 1, 2, ...
  url: string;         // artwork URL
  totalSides?: number; // optional, for deep-linking back
};

export default function CartArtworkThumb({ lineId, productId, side, url, totalSides }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const onRemove = () => {
    setErr(null);
    start(async () => {
      try {
        const res = await fetch(
          `/api/cart/lines/${encodeURIComponent(lineId)}/artwork?side=${side}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `Delete failed (${res.status})`);
        }
        // toast + refresh
        window.dispatchEvent(
          new CustomEvent("cart:toast", { detail: { message: `Removed artwork (side ${side})`, tone: "success" } })
        );
        router.refresh();
      } catch (e: any) {
        const msg = e?.message || "Failed to remove artwork";
        setErr(msg);
        window.dispatchEvent(new CustomEvent("cart:toast", { detail: { message: msg, tone: "error" } }));
      }
    });
  };

  const replaceHref = `/product/${productId}/upload-artwork?lineId=${encodeURIComponent(
    lineId
  )}&sides=${totalSides ?? 2}&focusSide=${side}#side-${side}`;

  return (
    <div className="flex items-center gap-2">
      <Image
        src={url}
        alt={`Artwork side ${side}`}
        width={56}
        height={56}
        className="rounded border object-cover"
        unoptimized
      />
      <div className="flex flex-col gap-1">
        <div className="text-[11px] text-neutral-600">Side {side}</div>
        <div className="flex gap-2">
          <Link
            href={replaceHref}
            className="inline-flex items-center rounded border px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
          >
            Replace
          </Link>
          <button
            onClick={onRemove}
            disabled={pending}
            className="inline-flex items-center rounded border px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            type="button"
          >
            {pending ? "Removing…" : "Remove"}
          </button>
        </div>
        {err ? <div className="text-[11px] text-red-600">{err}</div> : null}
      </div>
    </div>
  );
}
