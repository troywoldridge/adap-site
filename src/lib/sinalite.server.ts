// src/lib/sinalite.server.ts
import 'server-only';

type TokenResponse = { access_token: string; token_type: 'Bearer'; expires_in: number };

let _cachedToken: { token: string; exp: number } | null = null;

const BASE = (process.env.SINALITE_BASE_URL || 'https://api.sinaliteuppy.com').replace(/\/+$/,'');
const CLIENT_ID = process.env.SINALITE_CLIENT_ID!;
const CLIENT_SECRET = process.env.SINALITE_CLIENT_SECRET!;

// IMPORTANT: Use NUMERIC store id for server calls (per Sinalite API docs)
const STORE_ID = Number(process.env.SINALITE_STORE_ID || 9);

// Cart-level estimator path (sandbox)
const ORDER_PATH = process.env.SINALITE_ORDER_ESTIMATE_PATH || '/order/shippingEstimate';

// --- robust fetch with timeout + retries ---
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithTimeout(input: RequestInfo, init: RequestInit = {}, ms = 35000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(input, { ...init, signal: ctrl.signal, cache: 'no-store' });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function fetchWithRetry(url: string, init: RequestInit, opts?: { retries?: number; backoffsMs?: number[] }) {
  const retries = opts?.retries ?? 2;                   // total attempts = retries + 1
  const backoffs = opts?.backoffsMs ?? [750, 1500];     // simple backoff
  let lastErr: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, init, 35000);
      // Cloudflare / sandbox HTML errors (524/522/520) → retry if attempts remain
      if ([520, 522, 524].includes(res.status) && attempt < retries) {
        lastErr = new Error(`Upstream timeout ${res.status}: ${await res.text()}`);
      } else {
        return res;
      }
    } catch (e: any) {
      // AbortError or network → retry if attempts remain
      lastErr = e;
    }

    if (attempt < retries) {
      await sleep(backoffs[Math.min(attempt, backoffs.length - 1)]);
      continue;
    }
  }
  throw lastErr;
}

// --- token (cached) ---
export async function getSinaliteAccessToken(): Promise<string> {
  const now = Math.floor(Date.now()/1000);
  if (_cachedToken && _cachedToken.exp - 30 > now) return _cachedToken.token;

  const r = await fetchWithTimeout(`${BASE}/auth/token`, {
    method: 'POST',
    headers: { 'content-type':'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
      audience: 'sinalite-api',
    }),
  });

  if (!r.ok) throw new Error(`Token ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as TokenResponse;
  _cachedToken = { token: j.access_token, exp: Math.floor(Date.now()/1000) + (j.expires_in || 300) };
  return _cachedToken.token;
}

/**
 * CART-LEVEL estimate (sandbox): POST /order/shippingEstimate
 * items: [{ productId, optionIds, quantity }]
 */
export async function fetchOrderShippingEstimate(input: {
  shipCountry: 'US'|'CA';
  shipState: string;
  shipZip: string;
  items: Array<{ productId: number; optionIds: number[]; quantity: number }>;
}) {
  const token = await getSinaliteAccessToken();
  const url = `${BASE}${ORDER_PATH}`;
  const body = {
    storeCode: STORE_ID, // numeric store code on server calls (per Sinalite documentation)
    destination: { country: input.shipCountry, state: input.shipState, postalCode: input.shipZip },
    items: input.items.map(i => ({
      productId: i.productId,
      productOptions: i.optionIds,   // field naming per Sinalite docs
      quantity: i.quantity,
    })),
  };

  const r = await fetchWithRetry(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type':'application/json' },
    body: JSON.stringify(body),
  });

  const ct = r.headers.get('content-type') || '';
  if (!r.ok) throw new Error(`order/shippingEstimate ${r.status}: ${await r.text()}`);
  if (!ct.includes('application/json')) throw new Error(`Non-JSON from ${url}`);
  return r.json();
}

/** Normalize into a UI-friendly array for your component */
export function normalizeRates(raw: any) {
  const list = Array.isArray(raw?.rates) ? raw.rates : Array.isArray(raw) ? raw : raw?.shipping || [];
  return (list || []).map((r: any) => ({
    serviceCode: r.serviceCode ?? r.code ?? 'UNKNOWN',
    serviceName: r.serviceName ?? r.name ?? 'Shipping',
    carrier: r.carrier ?? r.provider ?? undefined,
    amount: Number(r.amount ?? r.price ?? r.total ?? 0),
    currency: r.currency ?? 'USD',
    eta: r.eta ?? r.estimatedDeliveryDate ?? r.delivery ?? undefined,
  }));
}
