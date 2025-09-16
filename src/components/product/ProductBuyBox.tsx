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
  const [choices, setChoices] = useState<Record<string, string>>({});
  const get = useCallback((name: string) => choices[name] ?? "", [choices]);
  const set = useCallback(
    (name: string, value: string) => setChoices((prev) => ({ ...prev, [name]: value })),
    [],
  );

  // Initialize defaults (first option in each group) once the groups arrive.
  useEffect(() => {
    setChoices((prev) => {
      const next = { ...prev };
      for (const g of optionGroups) {
        if (next[g.name] == null && g.options.length) next[g.name] = String(g.options[0].id);
      }
      return next;
    });
  }, [optionGroups]);

  // Numeric selection object for APIs
  const numericSelection = useMemo(
    () =>
      Object.fromEntries(Object.entries(choices).map(([k, v]) => [k, Number(v)])) as Record<
        string,
        number
      >,
    [choices],
  );

  // Option id list (numeric)
  const optionIds = useMemo(
    () => (Object.values(numericSelection).filter((v) => Number.isFinite(v)) as number[]),
    [numericSelection],
  );

  // Helper: find a group with a fuzzy name match
  const findGroup = useCallback(
    (needle: string) =>
      optionGroups.find((g) => g.name.toLowerCase().includes(needle.toLowerCase())),
    [optionGroups],
  );

  // Quantity: parse from the selected option's NAME (e.g., "25", "50")
  const quantity = useMemo(() => {
    const g = findGroup("quantity") || findGroup("qty") || findGroup("quantities");
    if (!g) return 1;
    const selId = Number(get(g.name) || "0");
    const opt = g.options.find((o) => o.id === selId);
    const n = Number.parseInt(opt?.name ?? "1", 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [get, findGroup, optionGroups]);

  // Sides (best effort)
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
  const [unitPrice, setUnitPrice] = useState(0);       // SELL, per-each (dollars)
  const [serverTotal, setServerTotal] = useState(0);   // SELL, line total (dollars)
  const [currency, setCurrency] = useState<"USD" | "CAD">("USD");

  // Fetch SELL price whenever the selection changes
  useEffect(() => {
    let cancelled = false;

    async function fetchPrice() {
      setLoadingPrice(true);
      setPriceError(null);
      try {
        const { total, curr } = await priceViaApi(productId, numericSelection, store);

        if (!cancelled) {
          const q = Math.max(1, quantity || 1);
          setServerTotal(total);          // dollars
          setUnitPrice(total / q);        // dollars
          setCurrency(curr);
        }
      } catch (e: any) {
        if (!cancelled) {
          setServerTotal(0);
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
    // include quantity because server total depends on the "Quantity" option ID
  }, [productId, store, optionIds.length, JSON.stringify(numericSelection), quantity]);

  /* ----------------------- Create line & navigate -------------------------- */
  const [navBusy, setNavBusy] = useState(false);

  const onAddAndUpload = useCallback(async () => {
    if (!optionIds.length || navBusy) return;
    setNavBusy(true);
    try {
      // We no longer send price to the server; server will reprice for integrity.
      const r = await fetch("/api/cart/lines", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId,
          quantity,   // server accepts quantity (and will normalize)
          optionIds,  // numeric ids
          store,      // so server knows US/CA context
        }),
        cache: "no-store",
      });

      const json = await r.json().catch(() => ({}));
      if (!r.ok || json?.ok === false) {
        throw new Error(json?.error || `Could not create cart line (${r.status})`);
      }

      const lineId: string = String(json.lineId ?? json?.line?.id ?? "");
      if (!lineId) throw new Error("Missing lineId in response");

      router.push(
        `/product/${productId}/upload-artwork?lineId=${encodeURIComponent(
          lineId,
        )}&sides=${Math.max(1, sides)}#side-1`,
      );
    } catch (e) {
      console.error("Add & Upload error:", (e as any)?.message || e);
    } finally {
      setNavBusy(false);
    }
  }, [navBusy, optionIds.length, productId, quantity, optionIds, sides, store, router]);

  /* --------------------------------- UI ----------------------------------- */
  const fmt = useCallback(
    (n: number) =>
      new Intl.NumberFormat(currency === "CAD" ? "en-CA" : "en-US", { style: "currency", currency }).format(n || 0),
    [currency],
  );

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
          Price (each){loadingPrice ? "…" : ""}: {fmt(unitPrice)}
        </div>
        <div>
          Subtotal: {fmt(serverTotal)}
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
/* LIVE PRICING (SELL): calls /api/price/pricing (markup applied)     */
/* Expects response (cents): { ok, currency, unitSellCents,           */
/*   lineSellCents }                                                  */
/* Returns dollars to the component for display.                      */
/* ------------------------------------------------------------------ */
async function priceViaApi(
  productId: number,
  selections: Record<string, number>,
  store: "US" | "CA",
): Promise<{ total: number; curr: "USD" | "CAD" }> {
  const optionIds = Object.values(selections).filter((n) => Number.isFinite(n));

  const res = await fetch("/api/price/pricing", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productId,
      store,
      quantity: inferQtyFromSelections(selections),
      optionIds,
    }),
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `Pricing failed (${res.status})`);
  }

  const curr = (json.currency === "CAD" ? "CAD" : "USD") as "USD" | "CAD";
  const lineSellCents = Number(json.lineSellCents);
  if (!Number.isFinite(lineSellCents)) throw new Error("Invalid line total in response");
  return { total: lineSellCents / 100, curr };
}

/** Best-effort quantity inference for the pricing call (same logic as component) */
function inferQtyFromSelections(selections: Record<string, number>) {
  // We don't have group names here, but server also derives price from optionIds.
  // To be safe, default to 1; the true quantity is encoded by the Quantity group optionId anyway.
  const n = Number(selections["Quantity"] || selections["Qty"] || 0);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
