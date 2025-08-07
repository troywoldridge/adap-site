// server-only
import fetch from "node-fetch";

let _token: string | null = null;
let _expiresAt = 0;

// 1) get or refresh your access token
async function getAccessToken(): Promise<string> {
  const now = Date.now() / 1000;
  if (_token && now < _expiresAt - 60) {
    return _token;
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SINALITE_BASE}/auth/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SIN_CLIENT_ID,
        client_secret: process.env.SIN_CLIENT_SECRET,
        audience: process.env.SIN_AUDIENCE,
        grant_type: "client_credentials",
      }),
    }
  );
  if (!res.ok) {
    throw new Error("Auth failed");
  }
  // 👇 **Type the response!**
  type AuthResponse = { access_token: string; expires_in: number; token_type: string };
  const data = (await res.json()) as AuthResponse;
  _token = `${data.token_type} ${data.access_token}`;
  _expiresAt = now + data.expires_in;
  return _token;
}


// 2) generic wrapper to Sinalite
async function sinaliteFetch<T>(
  path: string,
  opts: { method?: "GET" | "POST"; body?: any } = {}
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SINALITE_BASE}${path}`,
    {
      method: opts.method || "GET",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sinalite ${path} → ${err}`);
  }
  return (await res.json()) as T;
}

// 3) list all products (you may not need this if you drill by ID)
export function getProductList() {
  return sinaliteFetch<Array<{ id: number; sku: string; name: string }>>(
    `/product`
  );
}

// 4) fetch one product’s metadata & available options
export function getProductDetails(id: string, storeCode: string) {
  return sinaliteFetch<[Array<{ id: number; group: string; name: string }>, any[], any[]]>(
    `/product/${id}/${storeCode}`
  );
}

// 5) price a particular combination of option-IDs
export function priceProduct(
  id: string,
  storeCode: string,
  productOptions: Array<number | string>
) {
  return sinaliteFetch<{
    price: string;
    packageInfo: Record<string, any>;
    productOptions: Record<string, any>;
  }>(`/price/${id}/${storeCode}`, {
    method: "POST",
    body: { productOptions },
  });
}

export { sinaliteFetch };
