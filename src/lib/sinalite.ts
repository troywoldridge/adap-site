// src/lib/sinalite.ts
const SANDBOX = "https://api.sinaliteuppy.com";
const LIVE    = "https://liveapi.sinalite.com";
const API_BASE = process.env.NODE_ENV === "production" ? LIVE : SANDBOX;

const CLIENT_ID     = process.env.SINALITE_CLIENT_ID!;
const CLIENT_SECRET = process.env.SINALITE_CLIENT_SECRET!;
const AUDIENCE      = "https://apiconnect.sinalite.com";

let _cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now() / 1000;
  if (_cachedToken && _cachedToken.expiresAt - 30 > now) {
    return _cachedToken.token;
  }
  const res = await fetch(`${API_BASE}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      audience: AUDIENCE,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) {
    throw new Error("Sinalite auth failed");
  }
  const { access_token, token_type, expires_in } = await res.json();
  _cachedToken = {
    token: `${token_type} ${access_token}`,
    expiresAt: now + expires_in,
  };
  return _cachedToken.token;
}

async function authFetch(input: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  return fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: token,
      "Content-Type": "application/json",
    },
  });
}

export interface ProductSummary {
  id: number;
  sku: string;
  name: string;
  category: string;
  enabled: number;
}

export async function listProducts(): Promise<ProductSummary[]> {
  const res = await authFetch(`${API_BASE}/product`);
  if (!res.ok) {
    throw new Error("Failed to fetch product list");
  }
  return res.json();
}

/**
 * GET /product/{id}/{storeCode}
 * Returns [options[], pricingValues[], metadata[]]
 */
export async function getProductDetails(
  id: number,
  storeCode: string
): Promise<[any[], any[], any[]]> {
  const res = await authFetch(`${API_BASE}/product/${id}/${storeCode}`);
  if (!res.ok) {
    throw new Error("Failed to fetch product details");
  }
  return res.json();
}

/**
 * POST /price/{id}/{storeCode}
 * { productOptions: number[] }
 */
export async function priceProduct(
  id: number,
  storeCode: string,
  optionIds: number[]
): Promise<{
  price: string;
  packageInfo: Record<string, any>;
  productOptions: Record<string, any>;
}> {
  const res = await authFetch(`${API_BASE}/price/${id}/${storeCode}`, {
    method: "POST",
    body: JSON.stringify({ productOptions: optionIds }),
  });
  if (!res.ok) {
    throw new Error("Failed to price product");
  }
  return res.json();
}

/**
 * POST /order/shippingEstimate
 */
export async function shippingEstimate(body: any): Promise<any> {
  const res = await authFetch(`${API_BASE}/order/shippingEstimate`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch shipping estimate");
  }
  return res.json();
}

/**
 * POST /order/new
 */
export async function placeOrder(body: any): Promise<any> {
  const res = await authFetch(`${API_BASE}/order/new`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error("Failed to place order");
  }
  return res.json();
}
