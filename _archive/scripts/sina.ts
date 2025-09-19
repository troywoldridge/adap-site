// scripts/sina.ts
const API_BASE = process.env.SINALITE_API_BASE || "https://api.sinaliteuppy.com";
const AUDIENCE = process.env.SINALITE_AUDIENCE || "https://apiconnect.sinalite.com";

type TokenResponse = { access_token: string; token_type: string; expires_in?: number };

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < cachedToken.exp - 15_000) {
    return cachedToken.token;
  }

  const body = {
    client_id: process.env.SINALITE_CLIENT_ID,
    client_secret: process.env.SINALITE_CLIENT_SECRET,
    audience: AUDIENCE,
    grant_type: "client_credentials",
  };

  const res = await fetch(`${API_BASE}/auth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as any;
  if (!res.ok || !json?.access_token || !json?.token_type) {
    throw new Error(`SinaLite auth failed: ${res.status} ${res.statusText} :: ${JSON.stringify(json)}`);
  }

  const token = `${json.token_type} ${json.access_token}`;
  const exp = now + (Number(json.expires_in || 300) * 1000);
  cachedToken = { token, exp };
  return token;
}

async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 20000): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText} :: ${txt}`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(t);
  }
}

export async function getProductOptions(productId: number, storeCode: number) {
  const token = await getAccessToken();
  type Opt = { id: number; group: string; name: string; hidden: number };
  type PriceMeta = { hash: string; value: string; markup: number };
  type MetaObj = Record<string, any>;

  // Per docs: returns three arrays: [ options[], priceMeta[], meta[] ]
  return fetchJson<[Opt[], PriceMeta[], MetaObj[]]>(`${API_BASE}/product/${productId}/${storeCode}`, {
    headers: { authorization: token },
  });
}

export async function getPricePayload(productId: number, storeCode: number, productOptions: number[]) {
  const token = await getAccessToken();
  type PriceResponse = {
    price?: string;
    packageInfo?: Record<string, any>;
    productOptions?: Record<string, string>;
    price2?: any; // debug fields present sometimes
  };

  return fetchJson<PriceResponse>(`${API_BASE}/price/${productId}/${storeCode}`, {
    method: "POST",
    headers: {
      authorization: token,
      "content-type": "application/json",
    },
    body: JSON.stringify({ productOptions }),
  });
}
