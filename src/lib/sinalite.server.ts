// src/lib/sinalite.server.ts
// Canonical Sinalite server utilities: pricing + shipping estimate.
// Uses your existing getSinaliteAccessToken() util.
// Always refer to Sinalite API documentation. ✅

import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";

const DEFAULT_BASE = process.env.SINALITE_BASE_URL || "https://api.sinaliteuppy.com";
// If you're pointing at live later, set SINALITE_BASE_URL="https://liveapi.sinalite.com"

export function resolveStoreCode(country: "US" | "CA"): 9 | 6 {
  // Per Sinalite: 6 = Canada, 9 = US
  return country === "US" ? 9 : 6;
}

async function apiFetch<T>(
  path: string,
  opts: RequestInit & { baseUrl?: string } = {}
): Promise<T> {
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE;
  const token = await getSinaliteAccessToken(); // should return a Bearer token string

  const res = await fetch(`${baseUrl}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sinalite ${path} failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Price a single product configuration against Sinalite.
 * Endpoint: POST /price/{productId}/{storeCode}
 * Body: { productOptions: string[] }  // array of optionIds as strings
 * Returns: { price, packageInfo?, productOptions? }  // productOptions is group->optionId map
 */
export async function priceByOptionIds(params: {
  productId: number;
  storeCode: 6 | 9;
  optionIds: (string | number)[];
  baseUrl?: string; // allow overriding sandbox/live per call if needed
}) {
  const { productId, storeCode, optionIds, baseUrl } = params;
  type PriceResp = {
    price: string | number;
    packageInfo?: Record<string, string>;
    productOptions?: Record<string, string>; // e.g. { qty: "105", size: "4", Stock: "30", Turnaround: "140" }
  };
  return apiFetch<PriceResp>(`/price/${productId}/${storeCode}`, {
    method: "POST",
    body: JSON.stringify({ productOptions: optionIds.map(String) }),
    baseUrl,
  });
}

/**
 * Ask Sinalite for shipping methods & rates for the given items + destination.
 * Endpoint: POST /order/shippingEstimate
 * Body:
 * {
 *   items: [{ productId: number, options: Record<string, string> }], // group->optionId
 *   shippingInfo: { ShipCountry: "US"|"CA", ShipState: string, ShipZip: string }
 * }
 * Response: [{ carrier, method, price, days? }]
 */
export async function estimateShipping(params: {
  items: { productId: number; options: Record<string, string> }[];
  shippingInfo: { ShipCountry: "US" | "CA"; ShipState: string; ShipZip: string };
  baseUrl?: string;
}) {
  const { items, shippingInfo, baseUrl } = params;
  type EstimateResp = {
    carrier: string;
    method: string;
    price: number | string;
    days?: string | number;
  }[];
  return apiFetch<EstimateResp>(`/order/shippingEstimate`, {
    method: "POST",
    body: JSON.stringify({ items, shippingInfo }),
    baseUrl,
  });
}
