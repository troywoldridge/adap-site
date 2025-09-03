// src/lib/sinalite.ts
import "server-only";
import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";

/**
 * Sinalite REST client (server-only, TypeScript)
 * - Auth: Bearer access token from getSinaliteAccessToken()  (per SinaLite API docs)
 * - Safe defaults for base URL
 * - Strong error reporting and request timeouts
 * - No Next.js caching surprises (no-store + next.revalidate:0)
 */

// ---------- Minimal JSON type helpers ----------
export type JsonPrimitive = string | number | boolean | null;
export type Json = JsonPrimitive | Json[] | { [k: string]: Json };

// ---------- Base URL ----------
const BASE: string = (
  process.env.SINALITE_BASE_URL?.trim() ||
  process.env.SINALITE_API_BASE_URL?.trim() ||
  "https://apiconnect.sinalite.com"
).replace(/\/+$/, "");

// ---------- Types for our local helpers ----------
type StoreCode = string;
type Path = string;

// Extend RequestInit with Next.js `next` key and simple headers shape
type ApiFetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
  next?: { revalidate?: number };
};

// 10s default timeout for network protection
const DEFAULT_TIMEOUT_MS: number = Number(process.env.SINALITE_HTTP_TIMEOUT_MS ?? 10_000);

// Ensure we never call storefront endpoints without a store code
function resolveStoreCode(input?: string | null): StoreCode {
  const envStore = process.env.NEXT_PUBLIC_STORE_CODE?.trim();
  const store = (input ?? envStore ?? "").trim();
  if (!store) {
    throw new Error(
      "Missing storeCode. Pass it to the function OR set NEXT_PUBLIC_STORE_CODE in env."
    );
  }
  return store;
}

function buildUrl(path: Path): string {
  return `${BASE}/${path.replace(/^\/+/, "")}`;
}

function withBearer(token: unknown): string {
  if (typeof token !== "string" || token.length === 0) {
    throw new Error("getSinaliteAccessToken() did not return a non-empty string.");
  }
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

async function apiFetch<T = Json>(path: Path, init: ApiFetchOptions = {}): Promise<T | undefined> {
  // getSinaliteAccessToken() can return either raw token or "Bearer <token>"
  const raw = await getSinaliteAccessToken();
  const authz = withBearer(raw);

  const url = buildUrl(path);
  const controller = new AbortController();
  const timer: ReturnType<typeof setTimeout> = setTimeout(
    () => controller.abort(),
    DEFAULT_TIMEOUT_MS
  );

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: authz,
        ...(init.headers || {}),
      },
      cache: "no-store",
      // Prevent Next from caching on the server
      next: { revalidate: 0, ...(init.next || {}) },
    } as ApiFetchOptions);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // eslint-disable-next-line no-console
      console.error(
        `[sinalite.client] ${res.status} ${res.statusText} @ ${url}\n${body.slice(0, 1000)}`
      );
      throw new Error(`Sinalite request failed: ${res.status} ${res.statusText}`);
    }

    if (res.status === 204) {
      return undefined;
    }

    // We keep this generic because schemas differ per endpoint.
    return (await res.json()) as T;
  } catch (err: unknown) {
    const name = (err as { name?: string })?.name || "";
    if (name === "AbortError") {
      throw new Error(`Sinalite request timed out after ${DEFAULT_TIMEOUT_MS}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/*==========================================================
=            Public convenience wrappers (TS)              =
==========================================================*/

// If you have official types from the SinaLite docs, replace `any` below
export async function getCategories<T = any>(storeCode?: string): Promise<T> {
  const sc = resolveStoreCode(storeCode);
  return apiFetch<T>(`storefront/${encodeURIComponent(sc)}/categories`) as Promise<T>;
}

export async function getSubcategories<T = any>(
  storeCode: string | undefined,
  categoryId: string | number
): Promise<T> {
  const sc = resolveStoreCode(storeCode);
  const cid = encodeURIComponent(String(categoryId));
  return apiFetch<T>(`storefront/${encodeURIComponent(sc)}/categories/${cid}/subcategories`) as Promise<T>;
}

export async function getProductDetails<T = any>(
  productId: string | number,
  storeCode?: string
): Promise<T> {
  const sc = resolveStoreCode(storeCode);
  const pid = encodeURIComponent(String(productId));
  return apiFetch<T>(`storefront/${encodeURIComponent(sc)}/products/${pid}`) as Promise<T>;
}

/*==========================================================
=        (Optional) extra helpers you might want soon      =
==========================================================*/

export async function getProductOptions<T = any>(
  productId: string | number,
  storeCode?: string
): Promise<T> {
  const sc = resolveStoreCode(storeCode);
  const pid = encodeURIComponent(String(productId));
  return apiFetch<T>(`storefront/${encodeURIComponent(sc)}/products/${pid}/options`) as Promise<T>;
}

export async function getProductPricingByHash<T = any>(
  productId: string | number,
  hash: string,
  storeCode?: string
): Promise<T> {
  const sc = resolveStoreCode(storeCode);
  const pid = encodeURIComponent(String(productId));
  const h = encodeURIComponent(hash);
  return apiFetch<T>(`storefront/${encodeURIComponent(sc)}/products/${pid}/pricing?hash=${h}`) as Promise<T>;
}
