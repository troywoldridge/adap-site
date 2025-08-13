// src/lib/sinalite.client.ts
// Server-only helpers for SinaLite API (auth, product, price, shippingEstimate)
// Aligned with official docs:
// - /auth/token
// - /product
// - /product/:id
// - /product/:id/:store
// - /price/:id/:store
// - /order/new
// - /order/shippingEstimate
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

type Token = { access_token: string; token_type: string; expires_at: number };
let tokenCache: Token | null = null;

// Lazily read env so imports never crash
function env() {
  const API_BASE = process.env.SINALITE_API_BASE;          // e.g., https://api.sinaliteuppy.com or https://liveapi.sinalite.com
  const CLIENT_ID = process.env.SINALITE_CLIENT_ID;
  const CLIENT_SECRET = process.env.SINALITE_CLIENT_SECRET;
  const AUDIENCE = process.env.SINALITE_AUDIENCE;          // https://apiconnect.sinalite.com
  const STORE = process.env.NEXT_PUBLIC_STORE_CODE || "en_us";
  if (!API_BASE || !CLIENT_ID || !CLIENT_SECRET || !AUDIENCE) {
    throw new Error(
      "Missing SinaLite env vars. Required: SINALITE_API_BASE, SINALITE_CLIENT_ID, SINALITE_CLIENT_SECRET, SINALITE_AUDIENCE"
    );
  }
  return { API_BASE, CLIENT_ID, CLIENT_SECRET, AUDIENCE, STORE };
}

async function getAccessToken(): Promise<string> {
  const { API_BASE, CLIENT_ID, CLIENT_SECRET, AUDIENCE } = env();

  const now = Date.now();
  if (tokenCache && tokenCache.expires_at > now + 10_000) {
    return `${tokenCache.token_type} ${tokenCache.access_token}`;
  }

  const res = await fetch(`${API_BASE}/auth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      audience: AUDIENCE,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`SinaLite auth failed: ${res.status} ${res.statusText} – ${t}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    token_type: string;
    expires_in?: number;
  };

  const expires_in = json.expires_in ?? 3600;
  tokenCache = {
    access_token: json.access_token,
    token_type: json.token_type || "Bearer",
    expires_at: Date.now() + expires_in * 1000,
  };

  return `${tokenCache.token_type} ${tokenCache.access_token}`;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const auth = await getAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      authorization: auth,
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
    next: { revalidate: 600 },
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`SinaLite ${res.status} ${res.statusText} @ ${url}\n${t}`);
  }
  return res.json() as Promise<T>;
}

// ===== Public types =====
export type SinaliteProductMeta = {
  id: number;
  sku?: string;
  name: string;
  category?: string;
  enabled?: number;
  description?: string;
};

export type SinaliteValue = { id: number; name: string };
export type SinaliteOptionGroup = { group: string; label: string; values: SinaliteValue[] };

// Raw shapes from docs (regular) and roll-label (RL)
type RawOptionRegular = { id: number; group: string; name: string };
type RawOptionRollLabel = {
  name: string;               // group name
  label: string;
  option_id: number;
  html_type: string;
  opt_sort_order: number;
  opt_val_id: number;         // VALUE id
  option_val: string;         // VALUE label
  opt_val_sort_order: number;
  extra_turnaround_days: number;
};

// ===== API helpers =====
export async function getSinaliteProductMeta(
  productId: string | number
): Promise<SinaliteProductMeta> {
  const { API_BASE } = env();
  return getJson<SinaliteProductMeta>(`${API_BASE}/product/${productId}`);
}

/**
 * Internal helper to avoid any potential name collisions with ambient types.
 * Prefers /product/:id/:store response (options/pricing/meta arrays).
 */
async function fetchSinaliteProductArrays(
  productId: string | number,
  storeCode?: string
): Promise<{ optionsArray: any[]; pricingArray: any[]; metaArray: any[] }> {
  const { API_BASE, STORE } = env();
  const sc = storeCode || STORE;
  const payload = await getJson<any>(`${API_BASE}/product/${productId}/${sc}`);

  if (Array.isArray(payload)) {
    return {
      optionsArray: Array.isArray(payload[0]) ? payload[0] : [],
      pricingArray: Array.isArray(payload[1]) ? payload[1] : [],
      metaArray: Array.isArray(payload[2]) ? payload[2] : [],
    };
  }
  return {
    optionsArray: Array.isArray(payload?.options) ? payload.options : [],
    pricingArray: Array.isArray(payload?.pricing) ? payload.pricing : [],
    metaArray: Array.isArray(payload?.meta) ? payload.meta : [],
  };
}

// Re-export under the original public name so other imports keep working
export { fetchSinaliteProductArrays as getSinaliteProductArrays };

// ✅ Convenience helper your pages expect
export async function getProductDetails(
  productId: string | number,
  storeCode?: string
): Promise<[Record<string, any>]> {
  const { STORE } = env();
  const sc = storeCode || STORE;

  try {
    const { metaArray } = await fetchSinaliteProductArrays(productId, sc);
    if (Array.isArray(metaArray) && metaArray.length) {
      return [metaArray[0] as Record<string, any>];
    }
  } catch {
    // fall through
  }

  const meta = await getSinaliteProductMeta(productId);
  return [meta as unknown as Record<string, any>];
}

// Normalize options for UI
export function normalizeOptionGroups(optionsArray: any[]): SinaliteOptionGroup[] {
  const map = new Map<string, SinaliteOptionGroup>();

  const addValue = (groupKey: string, label: string, id: number, name: string) => {
    const key = groupKey.trim();
    const labelFinal = label || key;
    if (!map.has(key)) {
      map.set(key, { group: key, label: capitalize(labelFinal), values: [] });
    }
    const g = map.get(key)!;
    if (!g.values.some((v) => v.id === id)) {
      g.values.push({ id, name });
    }
  };

  for (const row of optionsArray || []) {
    // regular
    if (row && typeof row === "object" && "group" in row && "id" in row && "name" in row) {
      const r = row as RawOptionRegular;
      addValue(r.group, r.group, Number(r.id), String(r.name));
      continue;
    }
    // roll-label
    if (row && typeof row === "object" && "option_id" in row && "opt_val_id" in row && "option_val" in row) {
      const rr = row as RawOptionRollLabel;
      addValue(rr.name, rr.label || rr.name, Number(rr.opt_val_id), String(rr.option_val));
      continue;
    }
  }

  const orderHint = [
    "qty",
    "quantity",
    "turnaround",
    "stock",
    "size",
    "coating",
    "color",
    "colours",
    "colors",
    "round corners",
    "corners",
    "bundling",
  ];

  const groups = Array.from(map.values());
  groups.sort((a, b) => {
    const ai = indexIn(a.group, orderHint);
    const bi = indexIn(b.group, orderHint);
    if (ai !== bi) return ai - bi;
    return a.label.localeCompare(b.label);
  });

  for (const g of groups) {
    g.values.sort((x, y) =>
      numericAlpha(x.name).localeCompare(numericAlpha(y.name), undefined, { numeric: true })
    );
  }

  return groups;
}

// POST /price/:id/:store → { productOptions: [ids] }
export async function getSinalitePriceRegular(
  productId: string | number,
  optionIds: number[],
  storeCode?: string
): Promise<any> {
  const { API_BASE, STORE } = env();
  const auth = await getAccessToken();
  const sc = storeCode || STORE;

  const res = await fetch(`${API_BASE}/price/${productId}/${sc}`, {
    method: "POST",
    headers: {
      authorization: auth,
      "content-type": "application/json",
    },
    body: JSON.stringify({ productOptions: optionIds }),
    cache: "no-store",
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`SinaLite price failed: ${res.status} ${res.statusText}\n${t}`);
  }
  return res.json();
}

// === ID resolution for shipping/order ===
function norm(s: string) {
  return String(s).toLowerCase().replace(/[_\s-]+/g, " ").trim();
}

async function buildIdIndexes(productId: number, storeCode?: string) {
  const { optionsArray } = await fetchSinaliteProductArrays(productId, storeCode);
  const idIndex = new Map<number, { group: string; name: string }>();
  const groupIndex = new Map<string, { id: number; name: string }[]>();

  for (const row of optionsArray || []) {
    // regular
    if (row && "group" in row && "id" in row && "name" in row) {
      const g = String((row as RawOptionRegular).group);
      const id = Number((row as RawOptionRegular).id);
      const name = String((row as RawOptionRegular).name);
      idIndex.set(id, { group: g, name });
      const k = norm(g);
      if (!groupIndex.has(k)) groupIndex.set(k, []);
      groupIndex.get(k)!.push({ id, name });
      continue;
    }
    // roll-label
    if (row && "opt_val_id" in row && "option_val" in row && "name" in row) {
      const g = String((row as RawOptionRollLabel).name);
      const id = Number((row as RawOptionRollLabel).opt_val_id);
      const name = String((row as RawOptionRollLabel).option_val);
      idIndex.set(id, { group: g, name });
      const k = norm(g);
      if (!groupIndex.has(k)) groupIndex.set(k, []);
      groupIndex.get(k)!.push({ id, name });
      continue;
    }
  }
  return { idIndex, groupIndex };
}

/**
 * Resolve either:
 *  - optionIds: number[]
 *  - optionIdsByGroup: Record<string, string|number>
 * into the final **array of option IDs** expected by /order/shippingEstimate and /order/new.
 */
async function resolveOptionIds(params: {
  productId: number;
  optionIds?: number[];
  optionIdsByGroup?: Record<string, string | number>;
  storeCode?: string;
}): Promise<number[]> {
  if (Array.isArray(params.optionIds) && params.optionIds.length > 0) {
    // sanitize and return
    return Array.from(
      new Set(params.optionIds.map((n) => Number(n)).filter(Number.isFinite))
    );
  }

  const byGroup = params.optionIdsByGroup || {};
  const { idIndex, groupIndex } = await buildIdIndexes(params.productId, params.storeCode);
  const out: number[] = [];

  for (const [rawGroup, rawVal] of Object.entries(byGroup)) {
    const gKey = norm(rawGroup);
    const v = rawVal;

    // If already numeric and known, accept
    const asNum = Number(v);
    if (Number.isFinite(asNum) && idIndex.has(asNum)) {
      out.push(asNum);
      continue;
    }

    // Otherwise resolve by label match (strict, then loose)
    const list = groupIndex.get(gKey) || [];
    const sval = String(v).trim();
    let found: { id: number; name: string } | undefined =
      list.find((x) => norm(x.name) === norm(sval)) ||
      list.find((x) => norm(x.name).includes(norm(sval)));

    if (!found && Number.isFinite(asNum) && idIndex.has(asNum)) {
      // If the value was numeric but group didn't line up, still accept if it's a valid id
      const rec = idIndex.get(asNum)!;
      found = { id: asNum, name: rec.name };
    }

    if (found) {
      out.push(found.id);
    }
  }

  return Array.from(new Set(out));
}

/**
 * POST /order/shippingEstimate
 * payload: {
 *   items:[{ productId, options: number[] | (includes "5x6" when custom_size) }],
 *   shippingInfo:{ ShipCountry, ShipState, ShipZip }
 * }
 * returns: { statusCode, body: [ [carrier, method, price, days], ... ] }
 */
export async function estimateShipping(params: {
  productId: number;
  // Either pass numeric option IDs directly...
  optionIds?: number[];
  // ...or pass a { group: id|name } mapping (we will resolve to IDs)
  optionIdsByGroup?: Record<string, string | number>;
  shipCountry: "US" | "CA";
  shipState: string;
  shipZip: string;
  storeCode?: string;
  customSize?: string; // e.g., "5x6" for products with "custom_size" metadata
}): Promise<{ carrier: string; method: string; price: number; days: number }[]> {
  const { API_BASE } = env();
  const auth = await getAccessToken();

  const optionIds = await resolveOptionIds({
    productId: params.productId,
    optionIds: params.optionIds,
    optionIdsByGroup: params.optionIdsByGroup,
    storeCode: params.storeCode,
  });

  const optionsPayload: (number | string)[] =
    params.customSize ? [...optionIds, params.customSize] : optionIds;

  const payload = {
    items: [
      {
        productId: params.productId,
        options: optionsPayload, // <-- IDs array (plus custom size string if supplied)
      },
    ],
    shippingInfo: {
      ShipCountry: params.shipCountry,
      ShipState: params.shipState,
      ShipZip: params.shipZip,
    },
  };

  const res = await fetch(`${API_BASE}/order/shippingEstimate`, {
    method: "POST",
    headers: {
      authorization: auth,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

 if (!res.ok) {
  const t = await res.text().catch(() => "");
  // 4xx upstream means the payload wasn't acceptable to SinaLite (per SinaLite API docs)
  const status = res.status >= 400 && res.status < 500 ? res.status : 500;

  // ⬇️ Use Object.assign instead of `new Error(msg, { cause })`
  throw Object.assign(
    new Error(`Upstream ${res.status} ${res.statusText}: ${t || "Invalid request"}`),
    { cause: status }
  );
}


  const data = (await res.json()) as {
    statusCode?: number;
    body?: [string, string, number, number][];
  };

  const rows = Array.isArray(data?.body) ? data.body : [];
  return rows.map((r) => ({
    carrier: String(r[0]),
    method: String(r[1]),
    price: Number(r[2]),
    days: Number(r[3]),
  }));
}

/**
 * Default price snapshot for SEO/snippets.
 */
export async function getDefaultPriceSnapshot(
  productId: string | number,
  storeCode?: string
): Promise<{ price: number; currency: "USD" | "CAD" } | null> {
  try {
    const { STORE } = env();
    const sc = storeCode || STORE;
    const { optionsArray } = await fetchSinaliteProductArrays(productId, sc);
    const groups = normalizeOptionGroups(optionsArray);

    const qtyGroup = groups.find((g) => g.group.toLowerCase().includes("qty"));
    let optionIds: number[] = [];

    if (qtyGroup) {
      const parsed = qtyGroup.values
        .map((v) => ({ id: v.id, n: Number(String(v.name).replace(/[^\d.]/g, "")) }))
        .filter((x) => Number.isFinite(x.n))
        .sort((a, b) => a.n - b.n);
      const firstQtyId = parsed.length ? parsed[0].id : qtyGroup.values[0].id;
      optionIds.push(firstQtyId);
    }

    for (const g of groups) {
      if (qtyGroup && g.group === qtyGroup.group) continue;
      if (g.values.length) optionIds.push(g.values[0].id);
    }

    optionIds = Array.from(new Set(optionIds));

    const priceResp = await getSinalitePriceRegular(productId, optionIds, sc);
    const rawPrice =
      (priceResp as any)?.price ??
      (priceResp as any)?.price2?.price ??
      (priceResp as any)?.response?.price ??
      null;

    if (rawPrice == null) return null;

    const currency = sc.toLowerCase().includes("ca") ? "CAD" : "USD";
    return { price: Number(rawPrice), currency };
  } catch {
    return null;
  }
}

// ---- small utils ----
function capitalize(s: string) {
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
function indexIn(group: string, order: string[]) {
  const g = group.toLowerCase();
  const i = order.findIndex((o) => g === o || g.includes(o));
  return i === -1 ? 999 : i;
}
function numericAlpha(s: string) {
  return s.normalize("NFKD");
}
