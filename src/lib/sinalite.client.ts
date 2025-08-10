// src/lib/sinalite.client.ts
import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";

const BASE = (process.env.SINALITE_BASE_URL || process.env.SINALITE_API_BASE_URL || "").replace(
  /\/$/,
  ""
);

async function apiFetchJSON<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE) {
    throw new Error("Missing SINALITE_BASE_URL or SINALITE_API_BASE_URL");
  }
  const token = await getSinaliteAccessToken(); // "Bearer <jwt>"
  const url = `${BASE}/${path.replace(/^\//, "")}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error(`[sinalite.client] ${res.status} ${res.statusText} @ ${url}`, txt.slice(0, 800));
    throw new Error(`Sinalite request failed: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Official Sinalite endpoints we use:
 * - GET  /product
 * - GET  /product/{id}
 * - GET  /product/{id}/{storeCode}   (storeCode: 9 for US)
 * - GET  /pricedbykey/{id}/{key}
 * - POST /order/shippingEstimate
 * - POST /order/new
 */

export function listProducts() {
  return apiFetchJSON(`/product`);
}

export function getProductGeneral(id: string | number) {
  return apiFetchJSON(`/product/${encodeURIComponent(String(id))}`);
}

export function getProductDetails(
  productId: string | number,
  storeCode = process.env.NEXT_PUBLIC_STORE_CODE ?? "9"
) {
  return apiFetchJSON(
    `/product/${encodeURIComponent(String(productId))}/${encodeURIComponent(String(storeCode))}`
  );
}

export function getPriceByKey(productId: string | number, key: string) {
  return apiFetchJSON(
    `/pricedbykey/${encodeURIComponent(String(productId))}/${encodeURIComponent(key)}`
  );
}
