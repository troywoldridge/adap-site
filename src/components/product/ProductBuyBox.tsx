"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProceedToCheckout from "@/components/ProceedToCheckout";

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

export default function ProductBuyBox({
  productId,
  productName,
  optionGroups,
  store = "US",
  cloudflareImageId = null,
}: Props) {
  // selection per option group
  const [selected, setSelected] = useState<Record<number, number>>(() => {
    const seed: Record<number, number> = {};
    optionGroups.forEach((g, idx) => {
      const first = g.options?.[0]?.id;
      if (first) seed[idx] = first;
    });
    return seed;
  });

  // cart line count (sets)
  const [sets, setSets] = useState<number>(1);

  // live price state
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [currency, setCurrency] = useState<"USD" | "CAD">("USD");
  const [loadingPrice, setLoadingPrice] = useState<boolean>(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // stable option id list
  const optionIds = useMemo(() => {
    const ids: number[] = [];
    optionGroups.forEach((_, idx) => {
      const v = selected[idx];
      if (Number.isFinite(v)) ids.push(Number(v));
    });
    return ids;
  }, [selected, optionGroups]);

  // fetch live configured price
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
          body: JSON.stringify({ optionIds, quantity: sets }),
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
    return () => {
      abort = true;
    };
  }, [productId, store, sets, JSON.stringify(optionIds)]);

  const router = useRouter();

  /** Adds the current selection to the server cart (no navigation). */
  async function addCurrentSelection() {
    const payload = {
      productId,
      name: productName,
      optionIds,
      quantity: sets,
      cloudflareImageId: cloudflareImageId ?? null,
    };
    const res = await fetch("/api/cart/lines", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) {
      throw new Error(json?.error || `addToCart failed: ${res.status}`);
    }
  }

  /** “Add to Cart” then take user to /cart (keeps your previous behavior). */
  async function onAddToCart() {
    try {
      await addCurrentSelection();
      router.push("/cart");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add to cart");
    }
  }

  const subtotal = unitPrice * Math.max(1, sets);

  return (
    <div className="buybox">
      {optionGroups.map((g, idx) => (
        <div key={g.name} style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>{g.name}</label>
          <select
            className="select"
            value={selected[idx] ?? ""}
            onChange={(e) =>
              setSelected((prev) => ({ ...prev, [idx]: Number(e.target.value) }))
            }
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
          >
            {g.options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      ))}

      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          Quantity
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            aria-label="decrease"
            onClick={() => setSets((s) => Math.max(1, s - 1))}
            className="btn"
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb" }}
          >
            –
          </button>
          <span style={{ minWidth: 30, textAlign: "center" }}>{sets}</span>
          <button
            type="button"
            aria-label="increase"
            onClick={() => setSets((s) => Math.min(9999, s + 1))}
            className="btn"
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb" }}
          >
            +
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, fontWeight: 600 }}>
        <div>Price{loadingPrice ? "…" : ""}: {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(unitPrice)}</div>
        <div>Subtotal: {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(subtotal)}</div>
        {priceError ? (
          <div style={{ color: "#b91c1c", marginTop: 6 }}>{priceError}</div>
        ) : null}
      </div>

      {/* Buttons – let globals.css style them via .btn.primary */}
      <button
        type="button"
        onClick={onAddToCart}
        className="btn primary w-full"
        style={{ marginTop: 16 }}
        disabled={optionIds.length === 0}
      >
        Add to Cart
      </button>

      <ProceedToCheckout
        to="/cart"
        ensureAdded={addCurrentSelection}
        className="btn primary w-full"
      >
        Checkout
      </ProceedToCheckout>
    </div>
  );
}
