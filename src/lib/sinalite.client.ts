/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

/**
 * Sinalite REST client (server-only, TypeScript)
 * - Auth via Client Credentials (per SinaLite API docs)
 * - Token caching w/ expiry
 * - Strong error handling, optional timeouts, no Next cache
 * - Full set of helpers you showed (meta, arrays, pricing, shippingEstimate, SEO snapshot)
 * - Plus storefront helpers (categories, subcategories, product details/options/pricing by hash)
 *
 * NOTE: For any image thumbnails you render from product data or your uploads,
 * serve via Cloudflare CDN variants for max performance. ⚡
 */

// ─────────────────────────────────────────────────────────────
// ENV + CONFIG
// ─────────────────────────────────────────────────────────────
type Token = { access_token: string; token_type: string; expires_at: number };
let tokenCache: Token | null = null;

const DEFAULT_TIMEOUT_MS: number = Number(process.env.SINALITE_HTTP_TIMEOUT_MS ?? 10_000);

function env() {
  // Primary “modern” base (used by most docs)
  const API_BASE =
    process.env.SINALITE_API_BASE?.trim() ||
    process.env.SINALITE_BASE_URL?.trim() ||
    "https://api.sinaliteuppy.com";

  // Some older docs call the OAuth audience apiconnect
  const AUDIENCE =
    process.env.SINALITE_AUDIENCE?.trim() ||
    process.env.SINALITE_API_AUDIENCE?.trim() ||
    "https://apiconnect.sinalite.com";

  const CLIENT_ID = process.env.SINALITE_CLIENT_ID?.trim();
  const CLIENT_SECRET = process.env.SINALITE_CLIENT_SECRET?.trim();

  // Store code used by storefront + some endpoints
  const STORE = process.env.NEXT_PUBLIC_STORE_CODE?.trim() || "en_us";

  if (!API_BASE || !CLIENT_ID || !CLIENT_SECRET || !AUDIENCE) {
    throw new Error(
      "Missing SinaLite env vars. Required: SINALITE_API_BASE (or SINALITE_BASE_URL), SINALITE_CLIENT_ID, SINALITE_CLIENT_SECRET, SINALITE_AUDIENCE (or SINALITE_API_AUDIENCE), NEXT_PUBLIC_STORE_CODE"
    );
  }
  return { API_BASE: API_BASE.replace(/\/+$/, ""), CLIENT_ID, CLIENT_SECRET, AUDIENCE, STORE };
}

function resolveStoreCode(input?: string | null): string {
  const { STORE } = env();
  const sc = (input ?? STORE ?? "").trim();
  if (!sc) throw new Error("Missing storeCode. Pass a value or set NEXT_PUBLIC_STORE_CODE.");
  return sc;
}

function withBearer(token: string): string {
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

function buildUrl(base: string, path: string) {
  return `${base}/${path.replace(/^\/+/, "")}`;
}

function abortableTimeout(): { controller: AbortController; cancel: () => void } {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  return { controller, cancel: () => clearTimeout(to) };
}

// ─────────────────────────────────────────────────────────────
// AUTH (Client Credentials) with caching
// ─────────────────────────────────────────────────────────────
async function getAccessTokenRaw(): Promise<string> {
  const { API_BASE, CLIENT_ID, CLIENT_SECRET, AUDIENCE } = env();

  const now = Date.now();
  if (tokenCache && tokenCache.expires_at > now + 10_000) {
    return withBearer(`${tokenCache.token_type} ${tokenCache.access_token}`);
  }

  const url = buildUrl(API_BASE, "auth/token");
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      audience: AUDIENCE,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`SinaLite auth failed: ${res.status} ${res.statusText} – ${t}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    token_type?: string;
    expires_in?: number;
  };

  const expires_in = Number(json.expires_in ?? 3600);
  tokenCache = {
    access_token: json.access_token,
    token_type: json.token_type || "Bearer",
    expires_at: Date.now() + expires_in * 1000,
  };

  return withBearer(`${tokenCache.token_type} ${tokenCache.access_token}`);
}

// ─────────────────────────────────────────────────────────────
// Low-level JSON fetch (auth, timeout, error surfacing)
// ─────────────────────────────────────────────────────────────
class UpstreamError extends Error {
  status: number;
  body?: string;
  constructor(message: string, status = 500, body?: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function apiFetchJson<T = unknown>(
  path: string,
  init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> } = {}
): Promise<T> {
  const { API_BASE } = env();
  const auth = await getAccessTokenRaw();
  const url = buildUrl(API_BASE, path);

  const { controller, cancel } = abortableTimeout();

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        authorization: auth,
        "content-type": "application/json",
        ...(init.headers || {}),
      },
      cache: "no-store",
      next: { revalidate: 0 },
    });

    const raw = await res.text();

    if (!res.ok) {
      throw new UpstreamError(
        `SinaLite ${res.status} ${res.statusText} @ ${url}`,
        res.status,
        raw
      );
    }

    if (!raw) {
      // many endpoints return JSON; a totally empty body is unusual but handle gracefully
      return undefined as T;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      const t = raw.trim();
      if (/^product unavailable\.?$/i.test(t) || /^not found/i.test(t)) {
        throw new UpstreamError(`SinaLite 404 Product Unavailable @ ${url}`, 404, t);
      }
      throw new UpstreamError(`SinaLite returned non-JSON @ ${url}`, 502, t);
    }
  } finally {
    cancel();
  }
}

// ─────────────────────────────────────────────────────────────
// Public types (kept minimal; wire exact types later if you have OpenAPI)
// ─────────────────────────────────────────────────────────────
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

type RawOptionRegular = { id: number; group: string; name: string };
type RawOptionRollLabel = {
  name: string; // group name
  label: string;
  option_id: number;
  html_type: string;
  opt_sort_order: number;
  opt_val_id: number; // VALUE id
  option_val: string; // VALUE label
  opt_val_sort_order: number;
  extra_turnaround_days: number;
};

// ─────────────────────────────────────────────────────────────
// Storefront endpoints (catalog)
// ─────────────────────────────────────────────────────────────
export async function getCategories(storeCode?: string): Promise<unknown> {
  const sc = resolveStoreCode(storeCode);
  return apiFetchJson(`storefront/${encodeURIComponent(sc)}/categories`);
}

export async function getSubcategories(
  storeCode: string | undefined,
  categoryId: string | number
): Promise<unknown> {
  const sc = resolveStoreCode(storeCode);
  const cid = encodeURIComponent(String(categoryId));
  return apiFetchJson(`storefront/${encodeURIComponent(sc)}/categories/${cid}/subcategories`);
}

export async function getStorefrontProductDetails(
  productId: string | number,
  storeCode?: string
): Promise<unknown> {
  const sc = resolveStoreCode(storeCode);
  const pid = encodeURIComponent(String(productId));
  return apiFetchJson(`storefront/${encodeURIComponent(sc)}/products/${pid}`);
}

export async function getProductOptions(
  productId: string | number,
  storeCode?: string
): Promise<unknown> {
  const sc = resolveStoreCode(storeCode);
  const pid = encodeURIComponent(String(productId));
  return apiFetchJson(`storefront/${encodeURIComponent(sc)}/products/${pid}/options`);
}

export async function getProductPricingByHash(
  productId: string | number,
  hash: string,
  storeCode?: string
): Promise<unknown> {
  const sc = resolveStoreCode(storeCode);
  const pid = encodeURIComponent(String(productId));
  const h = encodeURIComponent(hash);
  return apiFetchJson(`storefront/${encodeURIComponent(sc)}/products/${pid}/pricing?hash=${h}`);
}

// ─────────────────────────────────────────────────────────────
// Classic endpoints from your existing file (kept intact)
// ─────────────────────────────────────────────────────────────
export async function getSinaliteProductMeta(
  productId: string | number
): Promise<SinaliteProductMeta> {
  const { API_BASE } = env();
  return apiFetchJson<SinaliteProductMeta>(`product/${productId}`);
}

/**
 * Prefer /product/:id/:store (arrays payload: options/pricing/meta).
 * Some tenants return `[options, pricing, meta]`, others `{options,pricing,meta}`.
 */
async function fetchSinaliteProductArrays(
  productId: string | number,
  storeCode?: string
): Promise<{ optionsArray: any[]; pricingArray: any[]; metaArray: any[] }> {
  const { API_BASE, STORE } = env();
  const sc = resolveStoreCode(storeCode ?? STORE);

  try {
    const payload = await apiFetchJson<any>(`product/${productId}/${sc}`);

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
  } catch (err: any) {
    if (err?.status === 404 || err?.status === 400) {
      return { optionsArray: [], pricingArray: [], metaArray: [] };
    }
    throw err;
  }
}

// Re-export under your historical name
export { fetchSinaliteProductArrays as getSinaliteProductArrays };

/** High-level “meta first” helper your pages expect */
export async function getProductDetails(
  productId: string | number,
  storeCode?: string
): Promise<[Record<string, any>]> {
  const sc = resolveStoreCode(storeCode);
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

// ─────────────────────────────────────────────────────────────
// Normalization + Pricing helpers
// ─────────────────────────────────────────────────────────────
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
    if (row && typeof row === "object" && "group" in row && "id" in row && "name" in row) {
      const r = row as RawOptionRegular;
      addValue(r.group, r.group, Number(r.id), String(r.name));
      continue;
    }
    if (row && typeof row === "object" && "option_id" in row && "opt_val_id" in row && "option_val" in row) {
      const rr = row as RawOptionRollLabel;
      addValue(rr.name, rr.label || rr.name, Number(rr.opt_val_id), String(rr.option_val));
      continue;
    }
  }

  const orderHint = ["qty", "quantity", "turnaround", "stock", "size", "coating", "color", "colours", "colors", "round corners", "corners", "bundling"];

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

/** POST /price/:id/:store with { productOptions: number[] } */
export async function getSinalitePriceRegular(
  productId: string | number,
  optionIds: number[],
  storeCode?: string
): Promise<any> {
  const { API_BASE, STORE } = env();
  const sc = resolveStoreCode(storeCode ?? STORE);

  const url = buildUrl(API_BASE, `price/${productId}/${sc}`);
  return apiFetchJson(url.replace(`${API_BASE}/`, ""), {
    method: "POST",
    body: JSON.stringify({ productOptions: optionIds }),
  });
}

// ─────────────────────────────────────────────────────────────
// Shipping estimate + helpers (IDs by group)
// ─────────────────────────────────────────────────────────────
function norm(s: string) {
  return String(s).toLowerCase().replace(/[_\s-]+/g, " ").trim();
}

async function buildIdIndexes(productId: number, storeCode?: string) {
  const { optionsArray } = await fetchSinaliteProductArrays(productId, storeCode);
  const idIndex = new Map<number, { group: string; name: string }>();
  const groupIndex = new Map<string, { id: number; name: string }[]>();

  for (const row of optionsArray || []) {
    if (row && "group" in row && "id" in row && "name" in row) {
      const r = row as RawOptionRegular;
      idIndex.set(Number(r.id), { group: String(r.group), name: String(r.name) });
      const k = norm(String(r.group));
      if (!groupIndex.has(k)) groupIndex.set(k, []);
      groupIndex.get(k)!.push({ id: Number(r.id), name: String(r.name) });
      continue;
    }
    if (row && "opt_val_id" in row && "option_val" in row && "name" in row) {
      const rr = row as RawOptionRollLabel;
      idIndex.set(Number(rr.opt_val_id), { group: String(rr.name), name: String(rr.option_val) });
      const k = norm(String(rr.name));
      if (!groupIndex.has(k)) groupIndex.set(k, []);
      groupIndex.get(k)!.push({ id: Number(rr.opt_val_id), name: String(rr.option_val) });
      continue;
    }
  }
  return { idIndex, groupIndex };
}

async function resolveOptionIds(params: {
  productId: number;
  optionIds?: number[];
  optionIdsByGroup?: Record<string, string | number>;
  storeCode?: string;
}): Promise<number[]> {
  if (Array.isArray(params.optionIds) && params.optionIds.length > 0) {
    return Array.from(new Set(params.optionIds.map((n) => Number(n)).filter(Number.isFinite)));
  }

  const byGroup = params.optionIdsByGroup || {};
  const { idIndex, groupIndex } = await buildIdIndexes(params.productId, params.storeCode);
  const out: number[] = [];

  for (const [rawGroup, rawVal] of Object.entries(byGroup)) {
    const gKey = norm(rawGroup);
    const sval = String(rawVal).trim();
    const asNum = Number(rawVal);

    if (Number.isFinite(asNum) && idIndex.has(asNum)) {
      out.push(asNum);
      continue;
    }

    const list = groupIndex.get(gKey) || [];
    const found =
      list.find((x) => norm(x.name) === norm(sval)) ||
      list.find((x) => norm(x.name).includes(norm(sval)));

    if (found) out.push(found.id);
    else if (Number.isFinite(asNum) && idIndex.has(asNum)) out.push(asNum);
  }

  return Array.from(new Set(out));
}

/**
 * POST /order/shippingEstimate
 * payload: {
 *   items:[{ productId, options: number[] | (includes "5x6" when custom_size) }],
 *   shippingInfo:{ ShipCountry, ShipState, ShipZip }
 * }
 * returns: array of { carrier, method, price, days }
 */
export async function estimateShipping(params: {
  productId: number;
  optionIds?: number[];
  optionIdsByGroup?: Record<string, string | number>;
  shipCountry: "US" | "CA";
  shipState: string;
  shipZip: string;
  storeCode?: string;
  customSize?: string; // e.g., "5x6" when product supports custom_size
}): Promise<{ carrier: string; method: string; price: number; days: number }[]> {
  const { API_BASE } = env();

  const optionIds = await resolveOptionIds({
    productId: params.productId,
    optionIds: params.optionIds,
    optionIdsByGroup: params.optionIdsByGroup,
    storeCode: params.storeCode,
  });

  const optionsPayload: (number | string)[] = params.customSize
    ? [...optionIds, params.customSize]
    : optionIds;

  const payload = {
    items: [{ productId: params.productId, options: optionsPayload }],
    shippingInfo: {
      ShipCountry: params.shipCountry,
      ShipState: params.shipState,
      ShipZip: params.shipZip,
    },
  };

  const url = buildUrl(API_BASE, "order/shippingEstimate");
  return apiFetchJson(url.replace(`${API_BASE}/`, ""), {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((data: any) => {
    const rows: [string, string, number, number][] = Array.isArray(data?.body) ? data.body : [];
    return rows.map((r) => ({
      carrier: String(r[0]),
      method: String(r[1]),
      price: Number(r[2]),
      days: Number(r[3]),
    }));
  });
}

/**
 * Default price snapshot for SEO/snippets.
 */
export async function getDefaultPriceSnapshot(
  productId: string | number,
  storeCode?: string
): Promise<{ price: number; currency: "USD" | "CAD" } | null> {
  try {
    const sc = resolveStoreCode(storeCode);
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

    const currency: "USD" | "CAD" = sc.toLowerCase().includes("ca") ? "CAD" : "USD";
    return { price: Number(rawPrice), currency };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// little utils
// ─────────────────────────────────────────────────────────────
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
