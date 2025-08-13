/* eslint-disable @typescript-eslint/no-explicit-any */

// Convert SinaLite combo representations to an array of numeric IDs
function toIdsArrayFromProductOptions(po: any): number[] {
  if (!po) return [];
  if (Array.isArray(po)) {
    return po.map((n) => Number(n)).filter(Number.isFinite);
  }
  if (typeof po === "object") {
    return Object.values(po).map((n: any) => Number(n)).filter(Number.isFinite);
  }
  return [];
}

function normalizeIdsFromRow(row: any): number[] {
  if (!row || typeof row !== "object") return [];
  if ("productOptions" in row) return toIdsArrayFromProductOptions(row.productOptions);
  if ("options" in row) return toIdsArrayFromProductOptions(row.options);
  if ("optionIds" in row) return toIdsArrayFromProductOptions(row.optionIds);
  if ("combo" in row) return toIdsArrayFromProductOptions(row.combo);
  if ("combination" in row) return toIdsArrayFromProductOptions(row.combination);
  if (row.response?.productOptions) return toIdsArrayFromProductOptions(row.response.productOptions);
  return [];
}

function extractPrice(row: any): number | null {
  if (!row || typeof row !== "object") return null;
  const candidates = [
    row.price,
    row.price2?.price,
    row.response?.price,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function extractPackageInfo(row: any): Record<string, any> | null {
  if (!row || typeof row !== "object") return null;
  return row.packageInfo || row.response?.packageInfo || null;
}

function keyFromIds(ids: number[]): string {
  return ids.slice().sort((a, b) => a - b).join("-");
}

/** Build a fast lookup index from pricingArray rows. */
export function buildPricingIndex(pricingArray: any[]): Map<string, { price: number; packageInfo?: any }> {
  const idx = new Map<string, { price: number; packageInfo?: any }>();
  for (const row of pricingArray || []) {
    const ids = normalizeIdsFromRow(row);
    if (ids.length === 0) {
      continue;
    }
    const price = extractPrice(row);
    if (price == null) continue;
    const pkg = extractPackageInfo(row) ?? undefined;
    idx.set(keyFromIds(ids), { price: Number(price), packageInfo: pkg });
  }
  return idx;
}

/** Try to resolve a price locally from the matrix (selected option IDs). */
export function resolveLocalPrice(
  optionIds: number[],
  pricingIndex: Map<string, { price: number; packageInfo?: any }>
) {
  const hit = pricingIndex.get(keyFromIds(optionIds));
  if (hit) return hit;
  return null;
}
