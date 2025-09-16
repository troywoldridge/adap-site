// src/lib/price/compute.ts
import "server-only";
import { priceByOptionIds, resolveStoreCode } from "@/lib/sinalite.server";
import { applyTieredMarkup, type Store } from "@/lib/pricing";

/** Inputs for price calculation (server-only). */
export type ComputePriceInput = {
  productId: number;
  store: Store;                 // "US" | "CA"
  quantity: number;             // selected qty
  optionIds: number[];          // exact chain for /price
  categoryId?: number | null;   // reserved for future per-category tiers
  subcategoryId?: number | null;
};

/** Output (cents) used by Buy Box + Cart. */
export type ComputePriceResult = {
  ok: true;
  currency: "USD" | "CAD";
  qty: number;
  unitSellCents: number;  // our retail (per-each)
  lineSellCents: number;  // our retail (total)
  unitCostCents: number;  // trade cost from SinaLite (per-each)
  lineCostCents: number;  // trade cost from SinaLite (total)
};

/** Canonical pricing: SinaLite cost -> tiered markup (line-level) */
export async function computePrice(input: ComputePriceInput): Promise<ComputePriceResult> {
  const qty = Math.max(1, Math.floor(Number(input.quantity) || 1));
  const storeCode = resolveStoreCode(input.store); // 9 US / 6 CA

  // 🔗 SinaLite API (per docs)
  const upstream: any = await priceByOptionIds({
    productId: input.productId,
    storeCode,
    optionIds: input.optionIds,
  });

  // Support BOTH shapes:
  // - { unitPriceCents }  — per-each trade cost (cents)
  // - { linePriceCents }  — total job trade cost (cents)
  const maybeUnit = Number(upstream?.unitPriceCents);
  const maybeLine = Number(upstream?.linePriceCents);

  let unitCostCents: number;
  let lineCostCents: number;

  if (Number.isFinite(maybeLine) && maybeLine > 0) {
    lineCostCents = Math.round(maybeLine);
    unitCostCents = Math.round(lineCostCents / qty);
  } else {
    unitCostCents = Number.isFinite(maybeUnit) ? Math.round(maybeUnit) : 0;
    lineCostCents = unitCostCents * qty;
  }

  // 📈 Apply tiered markup on the LINE total; ensure unit * qty == subtotal
  const { unitSellCents, lineSellCents } = await applyTieredMarkup({
    store: input.store,
    quantity: qty,
    lineCostCents,
  });

  return {
    ok: true,
    currency: input.store === "CA" ? "CAD" : "USD",
    qty,
    unitSellCents,
    lineSellCents,
    unitCostCents,
    lineCostCents,
  };
}
