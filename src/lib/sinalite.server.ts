// Canonical Sinalite server utilities (auth wrapper + pricing + shipping + storefront).
// 🔗 Always refer to SinaLite API documentation.
// Uses your existing getSinaliteAccessToken().

import "server-only";
import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";

export const API_BASE =
  process.env.SINALITE_API_BASE ||
  process.env.SINALITE_BASE_URL ||
  "https://api.sinaliteuppy.com"; // sandbox default

/** Per Sinalite: 6 = Canada, 9 = US (legacy numeric code some endpoints use) */
export function resolveStoreCode(country: "US" | "CA"): 9 | 6 {
  return country === "US" ? 9 : 6;
}

/** Normalize to "Bearer <token>" even if getSinaliteAccessToken already includes it. */
export async function getSinaliteBearer(): Promise<string> {
  const raw = await getSinaliteAccessToken();
  return /^Bearer\s/i.test(raw) ? raw : `Bearer ${raw}`;
}

function asBearer(token: string): string {
  return /^Bearer\s/i.test(token) ? token : `Bearer ${token}`;
}

function resolveStoreString(input?: string | null): string {
  const envStore = process.env.NEXT_PUBLIC_STORE_CODE?.trim();
  const sc = (input ?? envStore ?? "").trim();
  if (!sc) throw new Error("Missing storeCode (NEXT_PUBLIC_STORE_CODE).");
  return sc;
}

/** Typed fetch to Sinalite with auth + JSON, no-store cache. */
async function apiFetch<T>(
  path: string,
  init: RequestInit & { baseUrl?: string } = {}
): Promise<T> {
  const baseUrl = init.baseUrl ?? API_BASE;
  const token = await getSinaliteAccessToken();

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: asBearer(token),
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Sinalite ${path} failed: ${res.status} ${res.statusText} ${text.slice(0, 500)}`
    );
  }
  return res.json() as Promise<T>;
}

/* ────────────────────────────────────────────────────────────
   STOREFRONT CATALOG HELPERS (SinaLite docs)
   GET /storefront/{store}/subcategories/{id}
   GET /storefront/{store}/subcategories/{id}/products
──────────────────────────────────────────────────────────── */

export type SubcategoryDetails = {
  id: number;
  name?: string;
  slug?: string;
  description?: string;
  image?: string;
};

export async function getSubcategoryDetails(
  subcategoryId: number,
  storeCode?: string
): Promise<SubcategoryDetails> {
  const sc = resolveStoreString(storeCode);
  const sid = encodeURIComponent(String(subcategoryId));
  return apiFetch<SubcategoryDetails>(`/storefront/${encodeURIComponent(sc)}/subcategories/${sid}`);
}

export type StorefrontProduct = {
  id: number | string;
  name: string;
  sku?: string;
  image?: string;
  category_id?: number | string;
  subcategory_id?: number | string;
  // any other keys from SinaLite are passed through by your merge layer
  [k: string]: unknown;
};

export async function getProductsBySubcategory(
  subcategoryId: number,
  storeCode?: string
): Promise<StorefrontProduct[]> {
  const sc = resolveStoreString(storeCode);
  const sid = encodeURIComponent(String(subcategoryId));
  return apiFetch<StorefrontProduct[]>(
    `/storefront/${encodeURIComponent(sc)}/subcategories/${sid}/products`
  );
}

/* ────────────────────────────────────────────────────────────
   PRICING  (POST /price/{productId}/{storeCodeNumeric})
   NOTE: SinaLite returns the JOB TOTAL (line price).
──────────────────────────────────────────────────────────── */

type PriceResp = {
  price?: string | number;                 // job total for selected chain
  packageInfo?: Record<string, string>;
  productOptions?: Record<string, string>; // group -> optionId
};

export async function priceByOptionIds(params: {
  productId: number;
  storeCode: 6 | 9;
  optionIds: (number | string)[];
  baseUrl?: string;
}): Promise<{ linePriceCents: number; optionsByGroup: Record<string, string> }> {
  const { productId, storeCode, optionIds, baseUrl } = params;

  const data = await apiFetch<PriceResp>(`/price/${productId}/${storeCode}`, {
    method: "POST",
    body: JSON.stringify({ productOptions: optionIds.map(String) }),
    baseUrl,
  });

  // IMPORTANT: `price` is the full job total for the current option chain (Qty included).
  const priceNum = Number(data?.price);
  const linePriceCents = Number.isFinite(priceNum) ? Math.round(priceNum * 100) : 0;

  const optionsByGroup = (data?.productOptions ?? {}) as Record<string, string>;
  return { linePriceCents, optionsByGroup };
}

/* ────────────────────────────────────────────────────────────
   SHIPPING ESTIMATE (POST /order/shippingEstimate)
   Accepts both option-ids array and options map, per docs.
──────────────────────────────────────────────────────────── */

export type EstimateItemIds = { productId: number; optionIds: (number | string)[] };
export type EstimateItemMap = { productId: number; options: Record<string, string> };
export type EstimateDest = { ShipCountry: "US" | "CA"; ShipState: string; ShipZip: string };

export type ShippingRate = {
  carrier: string;
  serviceCode: string;
  serviceName: string;
  amount: number;
  currency: "USD" | "CAD";
  eta: string | null;
  days: number | null;
};

type EstimateRaw = {
  statusCode: number;
  body?: [string, string, number | string, number | string][];
};

export async function estimateShipping(params: {
  items: (EstimateItemIds | EstimateItemMap)[];
  shippingInfo: EstimateDest;
  baseUrl?: string;
}): Promise<ShippingRate[]> {
  const { items, shippingInfo, baseUrl } = params;
  if (!items?.length) throw new Error("No shippable items.");

  const itemsPayload = items.map((it: any) =>
    Array.isArray(it.optionIds)
      ? { productId: Number(it.productId), options: it.optionIds.map((v: any) => String(v)) }
      : { productId: Number(it.productId), options: it.options }
  );

  const raw = await apiFetch<EstimateRaw>(`/order/shippingEstimate`, {
    method: "POST",
    body: JSON.stringify({ items: itemsPayload, shippingInfo }),
    baseUrl,
  });

  const currency: "USD" | "CAD" = shippingInfo.ShipCountry === "US" ? "USD" : "CAD";

  return (raw.body ?? []).map(([carrier, method, price, d]) => {
    const amt = Number(price);
    const days = Number(d);
    return {
      carrier,
      serviceCode: String(method),
      serviceName: String(method),
      amount: Number.isFinite(amt) ? amt : 0,
      currency,
      eta: Number.isFinite(days) ? `${days} business day${days === 1 ? "" : "s"}` : null,
      days: Number.isFinite(days) ? days : null,
    };
  });
}
