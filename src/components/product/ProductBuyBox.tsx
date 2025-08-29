"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProceedToCheckout from "@/components/ProceedToCheckout";
import { flushShipChoiceToCart } from "@/lib/shippingChoice";

type Option = { id: number; name: string };
type Group = { name: string; options: Option[] };

type Props = {
  productId: number;
  productName: string;
  optionGroups: Group[];
  store?: "US" | "CA";
  cloudflareImageId?: string | null;
};

type PriceResp =
  | { ok: true; unitPrice: number; currency: "USD" | "CAD" }
  | { ok: false; error: string };

function normalizeLabel(s: unknown) {
  return String(s ?? "").toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
}
function findQtyGroupIndex(optionGroups: Group[]): number | null {
  const candidates = new Set(["qty", "quantity", "orderqty", "orderquantity"]);
  for (let i = 0; i < optionGroups.length; i++) {
    const label = normalizeLabel(optionGroups[i].name);
    if (candidates.has(label)) return i;
  }
  return null;
}
function findQtyValueIdByCount(g: Group, count: number): number | null {
  const wanted = String(count);
  const exact = g.options.find((o) => normalizeLabel(o.name) === normalizeLabel(wanted));
  if (exact) return exact.id;
  return g.options[0]?.id ?? null;
}

export default function ProductBuyBox({
  productId,
  productName,
  optionGroups,
  store = "US",
  cloudflareImageId = null,
}: Props) {
  const [selected, setSelected] = useState<Record<number, number>>(() => {
    const seed: Record<number, number> = {};
    optionGroups.forEach((g, idx) => {
      const first = g.options?.[0]?.id;
      if (first) seed[idx] = first;
    });
    return seed;
  });

  const [sets, setSets] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [currency, setCurrency] = useState<"USD" | "CAD">("USD");
  const [loadingPrice, setLoadingPrice] = useState<boolean>(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // guard to avoid duplicate adds (Add & Upload → Go to Cart)
  const lastLineId = useRef<string | null>(null);

  // If you want to ensure any chosen shipping is flushed, do it when the user clicks buttons
  // (calling it here at render was causing the await error).

  useEffect(() => {
    const qIdx = findQtyGroupIndex(optionGroups);
    if (qIdx == null) return;
    const qtyGroup = optionGroups[qIdx];
    const desiredId = findQtyValueIdByCount(qtyGroup, sets);
    if (desiredId != null && selected[qIdx] !== desiredId) {
      setSelected((prev) => ({ ...prev, [qIdx]: desiredId }));
    }
  }, [sets, optionGroups, selected]);

  const optionIds = useMemo(() => {
    const ids: number[] = [];
    optionGroups.forEach((_, idx) => {
      const v = selected[idx];
      if (Number.isFinite(v)) ids.push(Number(v));
    });
    return ids;
  }, [selected, optionGroups]);

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!productId || optionIds.length === 0) {
        setUnitPrice(0);
        setPriceError(null);
        return;
      }
      setLoadingPrice(true);
      setPriceError(null);
      try {
        const res = await fetch(`/api/sinalite/price/${productId}?store=${store}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ optionIds }),
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as PriceResp;
        if (!res.ok || !("ok" in json) || !json.ok) {
          throw new Error((json as any)?.error || `pricing failed`);
        }
        if (!abort) {
          setUnitPrice(Number(json.unitPrice || 0));
          setCurrency(json.currency || "USD");
        }
      } catch (err: unknown) {
        if (!abort) {
          setUnitPrice(0);
          setPriceError(err instanceof Error ? err.message : "pricing error");
        }
      } finally {
        if (!abort) setLoadingPrice(false);
      }
    })();
    return () => { abort = true; };
  }, [productId, store, JSON.stringify(optionIds)]);

  const router = useRouter();

  async function addAndGetLineId(): Promise<string | null> {
    const payload = {
      productId,
      name: productName,
      optionIds,
      quantity: sets,
      store,
      cloudflareImageId: cloudflareImageId ?? null,
    };
    const res = await fetch("/api/cart/add", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) {
      throw new Error(json?.error || `addToCart failed: ${res.status}`);
    }
    return json?.lineId ?? null;
  }

  async function onAddAndUpload() {
    try {
      const lineId = await addAndGetLineId();
      await flushShipChoiceToCart(); // flush chosen shipping (if any)
      if (lineId) {
        router.push(`/product/${productId}/upload-artwork?lineId=${encodeURIComponent(lineId)}`);
      } else {
        router.push("/cart");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add to cart");
    }
  }

  const subtotal = unitPrice * sets;

  return (
    <div className="buybox">
      {optionGroups.map((g, idx) => (
        <div key={g.name} className="mb-3">
          <label className="block font-semibold mb-1.5">{g.name}</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={selected[idx] ?? ""}
            onChange={(e) => setSelected((prev) => ({ ...prev, [idx]: Number(e.target.value) }))}
          >
            {g.options.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      ))}

      <div className="mt-4">
        <label className="block font-semibold mb-1.5">Quantity</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="decrease"
            onClick={() => setSets((s) => Math.max(1, s - 1))}
            className="rounded-md border border-gray-300 px-3 py-1.5"
          >–</button>
          <span className="min-w-[32px] text-center">{sets}</span>
          <button
            type="button"
            aria-label="increase"
            onClick={() => setSets((s) => Math.min(9999, s + 1))}
            className="rounded-md border border-gray-300 px-3 py-1.5"
          >+</button>
        </div>
      </div>

      <div className="mt-4 font-semibold space-y-1">
        <div>
          Price{loadingPrice ? "…" : ""}: {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(unitPrice)}
        </div>
        <div>
          Subtotal: {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(subtotal)}
        </div>
        {priceError ? <div className="text-red-700 mt-1">{priceError}</div> : null}
      </div>

      <button
        type="button"
        onClick={onAddAndUpload}
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow hover:bg-blue-800"
        disabled={optionIds.length === 0}
      >
        Add & Upload Artwork
      </button>

      <ProceedToCheckout
        to="/cart"
        className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-lg border border-gray-300 bg-gray-100 px-4 text-sm font-semibold text-gray-900 hover:bg-gray-200"
        ensureAdded={async () => {
          if (!lastLineId.current) {
            lastLineId.current = (await addAndGetLineId()) || lastLineId.current;
          }
          await flushShipChoiceToCart();
        }}
      >
        Go to Cart
      </ProceedToCheckout>
    </div>
  );
}
