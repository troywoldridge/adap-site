// src/lib/sinalite.client.ts

export interface RawProduct {
  id: number;
  sku: string;
  name: string;
  category: string;
  enabled: number;
}

export interface ProductOption {
  id: number;
  group: string;
  name: string;
}
export interface PricingValue {
  hash: string;
  value: string;
}
export interface ProductMetadata {
  metadata: string;
}
export type ProductDetails = [
  ProductOption[],
  PricingValue[],
  ProductMetadata[]
];
export interface PriceResponse {
  price: string;
  packageInfo: Record<string, any>;
  productOptions: Record<string, any>;
}

const API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://liveapi.sinalite.com"
    : "https://api.sinaliteuppy.com";

// SAFELY normalize headers to a plain string-to-string object
function normalizeHeaders(
  base: Record<string, string>,
  extra?: HeadersInit
): Record<string, string> {
  const out: Record<string, string> = { ...base };
  if (extra) {
    if (Array.isArray(extra)) {
      for (const [k, v] of extra) out[k] = v;
    } else if (extra instanceof Headers) {
      extra.forEach((v, k) => (out[k] = v));
    } else {
      Object.assign(out, extra);
    }
  }
  return out;
}

async function sinaliteFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.SINALITE_TOKEN;
  if (!token) {
    throw new Error("Missing SINALITE_TOKEN in environment");
  }

  const headers = normalizeHeaders(
    { Authorization: `Bearer ${token}` },
    init.headers
  );
  if (init.method === "POST") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(
      `Sinalite API Error [${res.status} ${res.statusText}]: ${errText}`
    );
  }
  return (await res.json()) as T;
}

// ============ API ============

export async function listProducts(): Promise<RawProduct[]> {
  return sinaliteFetch<RawProduct[]>("/product");
}
export async function getProductDetails(
  id: number,
  storeCode: string
): Promise<ProductDetails> {
  if (!id || !storeCode) {
    throw new Error("Missing id or storeCode for getProductDetails");
  }
  return sinaliteFetch<ProductDetails>(`/product/${id}/${storeCode}`);
}
export async function priceProduct(
  id: number,
  storeCode: string,
  optionIds: number[]
): Promise<PriceResponse> {
  if (!Array.isArray(optionIds) || optionIds.length === 0) {
    throw new Error("No option IDs supplied to priceProduct()");
  }
  return sinaliteFetch<PriceResponse>(`/price/${id}/${storeCode}`, {
    method: "POST",
    body: JSON.stringify({ productOptions: optionIds }),
  });
}
