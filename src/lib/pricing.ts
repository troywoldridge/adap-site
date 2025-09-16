// src/lib/pricing.ts
import "server-only";

export type Store = "US" | "CA";

type Tier = { min: number; max: number | null; mult: number; floorPct?: number };

function num(v: string | undefined, d: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
function bool(v: string | undefined, d: boolean) {
  if (v == null) return d;
  const s = String(v).toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

// sensible defaults; replace/augment with DB-driven rules later if desired
const DEFAULT_MULT_US = num(process.env.DEFAULT_MARKUP_MULTIPLIER_US, 1.6);
const DEFAULT_MULT_CA = num(process.env.DEFAULT_MARKUP_MULTIPLIER_CA, 1.6);
const GLOBAL_FLOOR = Math.max(0, Math.min(0.95, num(process.env.MIN_MARGIN_PCT, 0)));
const APPLY_LEVEL: "line" | "unit" =
  (process.env.MARKUP_APPLY_LEVEL ?? "line").toLowerCase() === "unit" ? "unit" : "line";
const USE_CHARM = bool(process.env.MARKUP_USE_DOT_99, false);

function parseTiers(jsonStr: string | undefined, fallbackMult: number): Tier[] {
  try {
    const arr = jsonStr ? (JSON.parse(jsonStr) as any[]) : [];
    const tiers = Array.isArray(arr) ? arr : [];
    const cleaned = tiers
      .map((t) => ({
        min: Math.max(1, Number(t?.min ?? 1)),
        max: t?.max == null ? null : Math.max(Number(t.max), 1),
        mult: Number(t?.mult ?? fallbackMult),
        floorPct: t?.floorPct != null ? Math.max(0, Math.min(0.95, Number(t.floorPct))) : undefined,
      }))
      .filter((t) => Number.isFinite(t.min) && Number.isFinite(t.mult));
    cleaned.sort((a, b) => a.min - b.min);
    return cleaned;
  } catch {
    return [];
  }
}

const TIERS_US = parseTiers(process.env.MARKUP_TIERS_US, DEFAULT_MULT_US);
const TIERS_CA = parseTiers(process.env.MARKUP_TIERS_CA, DEFAULT_MULT_CA);
function tiersFor(store: Store): Tier[] {
  return store === "CA" ? TIERS_CA : TIERS_US;
}
function pickTier(qty: number, tiers: Tier[], fallbackMult: number): Tier {
  const q = Math.max(1, Math.floor(qty || 1));
  for (const t of tiers) {
    const hi = t.max == null ? Infinity : t.max;
    if (q >= t.min && q <= hi) return t;
  }
  return { min: 1, max: null, mult: fallbackMult };
}
function applyMinMargin(sellCents: number, costCents: number, floorPct: number) {
  if (!(floorPct > 0)) return Math.round(sellCents);
  const floorSell = Math.ceil(costCents / (1 - floorPct));
  return Math.max(Math.round(sellCents), floorSell);
}
function charm99(cents: number) {
  if (!USE_CHARM) return Math.round(cents);
  if (cents < 1000) return Math.round(cents);
  const dollars = Math.floor(cents / 100);
  const target = dollars * 100 + 99;
  return target >= cents ? target : (dollars + 1) * 100 + 99;
}

/** Main export: apply tiered markup; recommended level = "line". */
export async function applyTieredMarkup(params: {
  store: Store;
  quantity: number;
  lineCostCents?: number;
  unitCostCents?: number;
}) {
  const quantity = Math.max(1, Math.floor(Number(params.quantity) || 1));
  let lineCostCents = Math.max(0, Math.round(params.lineCostCents ?? 0));
  if (!lineCostCents) {
    const unit = Math.max(0, Math.round(params.unitCostCents ?? 0));
    lineCostCents = unit * quantity;
  }
  const unitCostCents = Math.round(lineCostCents / quantity);

  const fallbackMult = params.store === "CA" ? DEFAULT_MULT_CA : DEFAULT_MULT_US;
  const chosen = pickTier(quantity, tiersFor(params.store), fallbackMult);
  const mult = Number.isFinite(chosen.mult) ? chosen.mult : fallbackMult;
  const floorPct = chosen.floorPct != null ? chosen.floorPct : GLOBAL_FLOOR;

  if (APPLY_LEVEL === "line") {
    const rawLineSell = Math.round(lineCostCents * mult);
    const flooredLineSell = applyMinMargin(rawLineSell, lineCostCents, floorPct);
    const finalLine = USE_CHARM ? charm99(flooredLineSell) : flooredLineSell;
    const unitSellCents = Math.round(finalLine / quantity);
    const lineSellCents = unitSellCents * quantity;
    return { unitSellCents, lineSellCents };
  } else {
    const rawUnitSell = Math.round(unitCostCents * mult);
    const flooredUnitSell = applyMinMargin(rawUnitSell, unitCostCents, floorPct);
    const finalUnit = USE_CHARM ? charm99(flooredUnitSell) : flooredUnitSell;
    const lineSellCents = finalUnit * quantity;
    return { unitSellCents: finalUnit, lineSellCents };
  }
}
