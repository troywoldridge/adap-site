// src/lib/cart.ts

export type CartLine = {
  productId: number | string;
  optionIds: (number | string)[];
  quantity: number | string;
};

export type SinaItem = { productId: number; optionIds: number[]; quantity: number };

/** Make sure we always pass clean numbers to Sinalite */
export function toSinaItems(lines: CartLine[]): SinaItem[] {
  return lines
    .map((l) => ({
      productId: Number(l.productId),
      optionIds: (Array.isArray(l.optionIds) ? l.optionIds : []).map((x) => Number(x)).filter((n) => Number.isFinite(n)),
      quantity: Math.max(1, Number(l.quantity || 1)),
    }))
    .filter((i) => Number.isFinite(i.productId) && i.optionIds.length > 0 && Number.isFinite(i.quantity));
}
