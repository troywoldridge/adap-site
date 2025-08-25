// src/lib/sinaliteOptionMap.ts
import { createLRU } from "@/lib/lru";
import { getSinaliteProductArrays, normalizeOptionGroups } from "@/lib/sinalite.client";

/** Tiny LRU so we don't re-fetch product option metadata constantly */
const v2gCache = createLRU<Record<number, string>>(200);

export type SinaOptions = { options: Record<string, string> };

/**
 * Build a map: valueId -> option-group key
 * (Keys must match SinaLite’s expected group names; values must be ID STRINGS)
 */
export async function valueIdToGroupKey(productId: number): Promise<Record<number, string>> {
  const cached = v2gCache.get(String(productId));
  if (cached) return cached;

  const { optionsArray } = await getSinaliteProductArrays(String(productId));
  const groups = normalizeOptionGroups(optionsArray || []);

  const map: Record<number, string> = {};
  for (const g of groups as any[]) {
    const rawKey = String(g?.name ?? g?.groupName ?? g?.label ?? g?.title ?? "").trim();
    if (!rawKey) continue;

    const opts: any[] =
      Array.isArray(g?.options) ? g.options :
      Array.isArray(g?.values)  ? g.values  :
      Array.isArray(g?.items)   ? g.items   :
      Array.isArray(g?.choices) ? g.choices : [];

    for (const o of opts) {
      const id = Number(o?.id ?? o?.valueId ?? o?.optionId ?? o?.value ?? o?.code);
      if (Number.isFinite(id) && id > 0) map[id] = rawKey;
    }
  }

  v2gCache.set(String(productId), map);
  return map;
}

/**
 * Convert a flat list of selected valueIds into SinaLite’s { options: { [group]: "valueId" } }.
 * If multiple ids map to the same group, last one wins (consistent with docs).
 */
export async function optionIdsToSinaOptions(
  productId: number,
  optionIds: number[],
): Promise<SinaOptions | null> {
  if (!productId || !Array.isArray(optionIds) || optionIds.length === 0) return null;

  const v2g = await valueIdToGroupKey(productId);
  const options: Record<string, string> = {};

  for (const idRaw of optionIds) {
    const id = Number(idRaw);
    if (!Number.isFinite(id)) continue;
    const groupKey = v2g[id];
    if (!groupKey) continue;
    options[groupKey] = String(id); // values must be ID strings
  }

  if (Object.keys(options).length === 0) return null;
  return { options };
}
