// src/components/product/ProductBuyBox.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/** Option+Group shape coming from the PDP */
type Option = { id: number; name: string };
type Group = { name: string; options: Option[] };

export default function ProductBuyBox({
  productId,
  productName,        // not used here but safe to keep
  optionGroups,
  store,
  cloudflareImageId,  // not used here but safe to keep
}: {
  productId: number;
  productName: string;
  optionGroups: Group[];
  store: "US" | "CA";
  cloudflareImageId?: string;
}) {
  const router = useRouter();

  /* --------------------- Selection State (string values) -------------------- */
  // Keep select values as strings so the <select> stays controlled.
  const [choices, setChoices] = useState<Record<string, string>>({});
  const get = useCallback((name: string) => choices[name] ?? "", [choices]);
  const set = useCallback(
    (name: string, value: string) =>
      setChoices((prev) => ({ ...prev, [name]: value })),
    []
  );

  // Initialize defaults (first option in each group) once the groups arrive.
  useEffect(() => {
    setChoices((prev) => {
      const next = { ...prev };
      for (const g of optionGroups) {
        if (next[g.name] == null && g.options.length) {
          next[g.name] = String(g.options[0].id);
        }
      }
      return next;
    });
  }, [optionGroups]);

  // Numeric selection object for APIs
  const numericSelection = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(choices).map(([k, v]) => [k, Number(v)])
      ) as Record<string, number>,
    [choices]
  );

  // Option id list (numeric) — handy for cart payloads
  const optionIds = useMemo(
    () =>
      Object.values(numericSelection).filter((v) =>
        Number.isFinite(v)
      ) as number[],
    [numericSelection]
  );

  // Helper: find a group with a fuzzy name match
  const findGroup = useCallback(
    (needle: string) =>
      optionGroups.find((g) =>
        g.name.toLowerCase().includes(needle.toLowerCase())
      ),
    [optionGroups]
  );

  // Quantity: parse from the selected option's NAME (e.g., "25", "50")
  const quantity = useMemo(() => {
    const g =
      findGroup("quantity") || findGroup("qty") || findGroup("quantities");
    if (!g) return 1;
    const selId = Number(get(g.name) || "0");
    const opt = g.options.find((o) => o.id === selId);
    const n = Number.parseInt(opt?.name ?? "1", 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [get, findGroup, optionGroups]);

  // Sides (best effort): look for a group mentioning "side"
  const sides = useMemo(() => {
    const g = findGroup("side");
    if (!g) return 2;
    const selId = Number(get(g.name) || "0");
    const opt = g.options.find((o) => o.id === selId);
    const label = (opt?.name || "").toLowerCase();
    if (/\b2\b|two|double/.test(label)) return 2;
    if (/\b1\b|one|single/.test(label)) return 1;
    return 2;
  }, [get, findGroup]);

  /* --------------------------- Pricing state/UI ---------------------------- */
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [unitPrice, setUnitPrice] = useState(0);
  const [currency, setCurrency] = useState<"USD" | "CAD">("USD");

  // Fetch price whenever the selection changes
  useEffect(() => {
    let cancelled = false;

    async function fetchPrice() {
      setLoadingPrice(true);
      setPriceError(null);
      try {
        const { unit, curr } = await priceViaApi(
          productId,
          numericSelection,
          store
        );
        if (!cancelled) {
          setUnitPrice(unit);
          setCurrency(curr);
        }
      } catch (e: any) {
        if (!cancelled) {
          setUnitPrice(0);
          setPriceError(e?.message || "Invalid price in response");
        }
      } finally {
        if (!cancelled) setLoadingPrice(false);
      }
    }

    if (optionIds.length > 0) fetchPrice();
    return () => {
      cancelled = true;
    };
  }, [productId, store, optionIds.length, JSON.stringify(numericSelection)]);

  const subtotal = useMemo(
    () => unitPrice * (quantity || 1),
    [unitPrice, quantity]
  );

  /* ----------------------- Create line & navigate -------------------------- */
  const [navBusy, setNavBusy] = useState(false);

  const onAddAndUpload = useCallback(async () => {
    if (!optionIds.length || navBusy) return;
    setNavBusy(true);
    try {
      const unitPriceCents = Math.round((Number(unitPrice) || 0) * 100);
      const lineTotalCents = Math.round((Number(subtotal) || 0) * 100);

      const r = await fetch("/api/cart/lines", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId,
          qty: quantity,       // server accepts qty or quantity
          optionIds,           // numeric ids
          unitPriceCents,
          lineTotalCents,
        }),
        cache: "no-store",
      });

      const json = await r.json().catch(() => ({}));
      if (!r.ok || json?.ok === false) {
        throw new Error(json?.error || `Could not create cart line (${r.status})`);
      }

      // Prefer explicit lineId; fall back to json.line?.id
      const lineId: string =
        String(json.lineId ?? json?.line?.id ?? "");

      if (!lineId) {
        throw new Error("Missing lineId in response");
      }

      router.push(
        `/product/${productId}/upload-artwork?lineId=${encodeURIComponent(
          lineId
        )}&sides=${Math.max(1, sides)}#side-1`
      );
    } catch (e) {
      console.error("Add & Upload error:", (e as any)?.message || e);
    } finally {
      setNavBusy(false);
    }
  }, [navBusy, optionIds.length, unitPrice, subtotal, productId, quantity, optionIds, sides, router]);

  /* --------------------------------- UI ----------------------------------- */
  return (
    <div className="space-y-4">
      {optionGroups.map((g) => (
        <div key={g.name} className="mb-3">
          <label className="block font-semibold mb-1.5">{g.name}</label>
          <select
            className="w-full rounded-lg border border-gray-300"
            value={get(g.name)}
            onChange={(e) => set(g.name, e.target.value)}
          >
            {g.options.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      ))}

      <div className="mt-4 font-semibold space-y-1">
        <div>
          Price{loadingPrice ? "…" : ""}:{" "}
          {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
            unitPrice || 0
          )}
        </div>
        <div>
          Subtotal:{" "}
          {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
            subtotal || 0
          )}
        </div>
        {priceError ? <div className="text-red-700 mt-1">{priceError}</div> : null}
      </div>

      <button
        type="button"
        onClick={onAddAndUpload}
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow hover:bg-blue-800 disabled:opacity-50"
        disabled={optionIds.length === 0 || loadingPrice || navBusy}
      >
        {navBusy ? "Preparing…" : "Add & Upload Artwork"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LIVE PRICING: calls your /api/price route                          */
/* Sends BOTH `selections` (name->id) and `options` (number[]) so     */
/* it works with either server implementation.                        */
/* Expected response: { ok:true, unitPrice:number, currency:"USD|CAD"}*/
/* ------------------------------------------------------------------ */
async function priceViaApi(
  productId: number,
  selections: Record<string, number>,
  store: "US" | "CA"
): Promise<{ unit: number; curr: "USD" | "CAD" }> {
  const options = Object.values(selections).filter((n) => Number.isFinite(n));

  const res = await fetch("/api/price", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productId,
      store,
      selections, // key->id mapping
      options,    // numeric list (compat)
    }),
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `Pricing failed (${res.status})`);
  }

  const unit = Number(json.unitPrice);
  const curr = (json.currency === "CAD" ? "CAD" : "USD") as "USD" | "CAD";
  if (!Number.isFinite(unit)) throw new Error("Invalid price in response");
  return { unit, curr };
}
