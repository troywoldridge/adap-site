// src/lib/sinalite.server.ts
// Canonical Sinalite server utilities (auth wrapper + pricing + shipping).
// 🔗 Always refer to Sinalite API documentation. Uses your existing getSinaliteAccessToken().

import "server-only";
import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";

export const API_BASE =
  process.env.SINALITE_API_BASE ||
  process.env.SINALITE_BASE_URL ||
  "https://api.sinaliteuppy.com"; // sandbox default

/** Per Sinalite: 6 = Canada, 9 = US */
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

/* ────────────────────────────────────────────────────────────────────────────
   Pricing
   Endpoint: POST /price/{productId}/{storeCode}
   Body: { productOptions: string[] } // option value IDs as strings
   NOTE: SinaLite returns the JOB TOTAL (line price), not a per-unit price.
──────────────────────────────────────────────────────────────────────────── */

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

/* ────────────────────────────────────────────────────────────────────────────
   Shipping Estimate
   Endpoint: POST /order/shippingEstimate
   Supports BOTH shapes:
   - items: [{ productId, optionIds: number[] }] ➜ send array of strings
   - items: [{ productId, options: Record<string,string> }] ➜ send map directly
──────────────────────────────────────────────────────────────────────────── */

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

  return (raw.body ?? []).map(([carrier, method, price, days]) => {
    const amt = Number(price);
    const d = Number(days);
    return {
      carrier,
      serviceCode: String(method),
      serviceName: String(method),
      amount: Number.isFinite(amt) ? amt : 0,
      currency,
      eta: Number.isFinite(d) ? `${d} business day${d === 1 ? "" : "s"}` : null,
      days: Number.isFinite(d) ? d : null,
    };
  });
}
