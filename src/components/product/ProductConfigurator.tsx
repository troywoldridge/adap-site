// src/components/product/ProductConfigurator.tsx
"use client";

import * as React from "react";
import { buildPricingIndex, resolveLocalPrice } from "@/lib/sinalite.pricing-local";

type Value = { id: number; name: string };
type OptionGroup = { group: string; label: string; values: Value[] };

type Props = {
  productId: string;
  options: OptionGroup[];
  pricingMatrix?: any[];
  // ★ new: let parent (Buy Box) get optionIds + a display quantity
  onChange?: (data: { optionIds: number[]; quantity: number }) => void;
};

const STORE = process.env.NEXT_PUBLIC_STORE_CODE || "en_us";
const CURRENCY = STORE.toLowerCase().includes("ca") ? "CAD" : "USD";

function isQtyGroup(name: string) {
  const n = (name || "").toLowerCase();
  return n === "qty" || n === "quantity";
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat(
    CURRENCY === "CAD" ? "en-CA" : "en-US",
    { style: "currency", currency: CURRENCY, maximumFractionDigits: 2 },
  ).format(n);
}

// ★ helper: parse a numeric from a qty option’s name ("25", "1,000", "1000 pcs", etc.)
function parseQtyFromLabel(label: string | undefined): number | null {
  if (!label) return null;
  const m = label.replace(/[^\d]/g, "");
  const n = Number(m);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function ProductConfigurator({ productId, options, pricingMatrix, onChange }: Props) {
  const [selected, setSelected] = React.useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const g of options) if (g.values.length) init[g.group] = g.values[0].id;
    return init;
  });

  const hasQtyGroup = React.useMemo(() => options.some((g) => isQtyGroup(g.group)), [options]);

  const [manualQty, setManualQty] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [price, setPrice] = React.useState<number | null>(null);
  const [selectedSummary, setSelectedSummary] = React.useState<Record<string, string>>({});
  const [pkgInfo, setPkgInfo] = React.useState<Record<string, string | number> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showDebug, setShowDebug] = React.useState(false);

  const pricingIndex = React.useMemo(() => {
    if (!pricingMatrix || pricingMatrix.length === 0) return null;
    try { return buildPricingIndex(pricingMatrix); } catch { return null; }
  }, [pricingMatrix]);

  const broadcastSelections = React.useCallback((sel: Record<string, number>) => {
    try { window.dispatchEvent(new CustomEvent("sinalite:selectedOptions", { detail: { ...sel } })); } catch {}
  }, []);

  React.useEffect(() => { broadcastSelections(selected); /* eslint-disable-next-line */ }, []);

  const computeOptionIds = React.useCallback((): number[] => {
    const optionIds: number[] = [];
    for (const g of options) {
      const id = selected[g.group];
      if (typeof id === "number") optionIds.push(id);
    }
    return optionIds;
  }, [options, selected]);

  // ★ helper: expose a human quantity to parent (from qty group or manual)
  const currentDisplayQty = React.useMemo(() => {
    if (hasQtyGroup) {
      const group = options.find((g) => isQtyGroup(g.group));
      const valId = group ? selected[group.group] : undefined;
      const label = group?.values.find((v) => v.id === valId)?.name;
      return parseQtyFromLabel(label) ?? 1;
    }
    const n = Number(manualQty);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [hasQtyGroup, options, selected, manualQty]);

  // ★ Server pricing: send { optionIds } only. Derive store/option map server-side (per SinaLite docs).
  const fetchServerPrice = React.useCallback(async (optionIds: number[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sinalite/price/${productId}?store=${STORE.includes("ca") ? "CA" : "US"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ optionIds }), // ← essential: array of value IDs (qty included if present)
        cache: "no-store",
      });

      const text = await res.text();
      let json: any;
      try { json = JSON.parse(text); } catch { throw new Error("Unexpected response from pricing service."); }

      if (!res.ok || json?.error || json?.ok === false) {
        throw new Error(json?.message || json?.error || `Pricing failed (${res.status})`);
      }

      const p = json?.unitPrice ?? json?.price ?? json?.response?.price ?? null;
      setPrice(p != null ? Number(p) : null);

      const human = json?.meta?.productOptions || json?.productOptions || json?.response?.productOptions || {};
      setSelectedSummary(human);

      const pkg = json?.meta?.packageInfo || json?.packageInfo || json?.response?.packageInfo || null;
      setPkgInfo(pkg);
    } catch (e: any) {
      setPrice(null);
      setSelectedSummary({});
      setPkgInfo(null);
      setError(e?.message || "Unexpected error");
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  // Main recalc (local matrix first, then server)
  const recalc = React.useCallback(async () => {
    const optionIds = computeOptionIds();

    // keep shipping estimator in sync
    broadcastSelections(selected);

    // ★ also notify parent (Buy Box) so "Add & Upload" has the same IDs
    onChange?.({ optionIds, quantity: currentDisplayQty });

    // Try local matrix first
    if (pricingIndex) {
      const hit = resolveLocalPrice(optionIds, pricingIndex);
      if (hit) {
        setPrice(hit.price);
        const human: Record<string, string> = {};
        for (const g of options) {
          const id = selected[g.group];
          const val = g.values.find((v) => v.id === id);
          if (val) human[g.label] = val.name;
        }
        setSelectedSummary(human);
        setPkgInfo(hit.packageInfo ?? null);
        setError(null);
        return;
      }
    }

    // Fallback: server pricing (authoritative per SinaLite)
    await fetchServerPrice(optionIds);
  }, [broadcastSelections, computeOptionIds, currentDisplayQty, fetchServerPrice, onChange, options, pricingIndex, selected]);

  // Debounce recalculation on selection or manual qty
  React.useEffect(() => {
    const t = setTimeout(() => { void recalc(); }, 150);
    return () => clearTimeout(t);
  }, [recalc, manualQty]);

  return (
    <aside className="ui-card" aria-live="polite">
      <h3 className="section-title">Configure & Price</h3>

      {options.map((g) => (
        <div key={g.group} style={{ marginBottom: 12 }}>
          <label htmlFor={`opt-${g.group}`} style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
            {g.label}
          </label>
          <select
            id={`opt-${g.group}`}
            className="input"
            value={selected[g.group]}
            onChange={(e) => setSelected((prev) => ({ ...prev, [g.group]: Number(e.target.value) }))}
          >
            {g.values.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      ))}

      {!hasQtyGroup && (
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="manual-qty" style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Qty</label>
          <input
            id="manual-qty"
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="Enter quantity"
            value={manualQty}
            onChange={(e) => setManualQty(e.target.value)}
            className="input"
          />
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            This product doesn’t have a Qty option; enter a quantity here.
          </div>
        </div>
      )}

      <button onClick={() => void recalc()} disabled={isLoading} className="btn btn-primary">
        {isLoading ? "Calculating…" : "Recalculate"}
      </button>

      <div style={{ marginTop: 14 }}>
        {typeof price === "number" && (
          <p style={{ margin: "8px 0 6px", fontSize: 16 }}>
            <strong>Price:</strong> {formatCurrency(price)}
          </p>
        )}

        {Object.keys(selectedSummary).length > 0 && (
          <div className="muted" style={{ fontSize: 14, lineHeight: 1.4 }}>
            <strong>Selected:</strong>{" "}
            {Object.entries(selectedSummary).map(([k, v]) => `${k}: ${String(v)}`).join(", ")}
          </div>
        )}

        <details
          style={{ marginTop: 8, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}
          open={showDebug}
          onToggle={(e) => setShowDebug((e.target as HTMLDetailsElement).open)}
        >
          <summary style={{ cursor: "pointer" }}>Debug details</summary>
          <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>
            {JSON.stringify(
              { currency: CURRENCY, hasQtyGroup, manualQty, selected, packageInfo: pkgInfo },
              null,
              2
            )}
          </pre>
        </details>

        {error && (
          <div
            style={{
              marginTop: 8, padding: 10, borderRadius: 8,
              background: "#fff1f2", color: "#991b1b", border: "1px solid #fecaca", fontSize: 14,
            }}
          >
            {error}
          </div>
        )}
      </div>
    </aside>
  );
}
