// src/lib/sinalite.client.ts
import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";

// Prefer env; fall back to apiconnect (same audience as your token)
const BASE =
  process.env.SINALITE_BASE_URL ||
  process.env.SINALITE_API_BASE_URL ||
  "https://apiconnect.sinalite.com";

function assertEnv(name: string, value: string | undefined) {
  if (!value || !value.trim()) {
    throw new Error(`Missing required env: ${name}`);
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getSinaliteAccessToken(); // returns "Bearer x.y.z"
  const url = `${BASE.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      ...(init.headers || {}),
    },
    // avoid Next cache surprises while we debug
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // Surface detail in server logs
    console.error(`[sinalite.client] ${res.status} ${res.statusText} @ ${url}`, body?.slice(0, 800));
    throw new Error(`Sinalite request failed: ${res.status} ${res.statusText}`);
  }

  // Most endpoints are JSON
  return res.json() as Promise<T>;
}

// ---------- Public API ----------
export async function getCategories(storeCode: string) {
  assertEnv("NEXT_PUBLIC_STORE_CODE", storeCode);
  // storefront categories are under /storefront/:storeCode/...
  // use the same BASE + Bearer token (many environments require auth even for catalog)
  return apiFetch(`storefront/${encodeURIComponent(storeCode)}/categories`);
}

export async function getSubcategories(storeCode: string, categoryId: string | number) {
  assertEnv("NEXT_PUBLIC_STORE_CODE", storeCode);
  return apiFetch(
    `storefront/${encodeURIComponent(storeCode)}/categories/${encodeURIComponent(
      String(categoryId)
    )}/subcategories`
  );
}

export async function getProductDetails(productId: string | number, storeCode: string) {
  assertEnv("NEXT_PUBLIC_STORE_CODE", storeCode);
  return apiFetch(`storefront/${encodeURIComponent(storeCode)}/products/${encodeURIComponent(String(productId))}`);
}
