import "server-only";
import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";

/**
 * Sinalite REST client (server-only, JavaScript)
 * - Auth: Bearer access token from getSinaliteAccessToken() (per Sinalite API docs)
 * - Safe defaults for base URL
 * - Strong error reporting and request timeouts
 * - No Next.js caching surprises (no-store)
 */

// Base URL preference: explicit env > legacy env > documented default
const BASE = (
  process.env.SINALITE_BASE_URL?.trim() ||
  process.env.SINALITE_API_BASE_URL?.trim() ||
  "https://apiconnect.sinalite.com"
).replace(/\/+$/, "");

// Enforce we never call storefront endpoints without a store code
function resolveStoreCode(input) {
  const envStore = process.env.NEXT_PUBLIC_STORE_CODE?.trim();
  const store = (input ?? envStore ?? "").trim();
  if (!store) {
    throw new Error(
      "Missing storeCode. Pass it to the function OR set NEXT_PUBLIC_STORE_CODE in env."
    );
  }
  return store;
}

function buildUrl(path) {
  return `${BASE}/${path.replace(/^\/+/, "")}`;
}

function withBearer(token) {
  // Normalize: allow either raw token or already "Bearer ..."
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

// 10s default timeout for network protection
const DEFAULT_TIMEOUT_MS = Number(process.env.SINALITE_HTTP_TIMEOUT_MS ?? 10_000);

async function apiFetch(path, init = {}) {
  // getSinaliteAccessToken() can return either raw token or "Bearer <token>"
  const raw = await getSinaliteAccessToken();
  const authz = withBearer(raw);

  const url = buildUrl(path);
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

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
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[sinalite.client] ${res.status} ${res.statusText} @ ${url}\n${body.slice(0, 1000)}`
      );
      throw new Error(`Sinalite request failed: ${res.status} ${res.statusText}`);
    }

    if (res.status === 204) {
      return undefined;
    }

    return await res.json();
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(`Sinalite request timed out after ${DEFAULT_TIMEOUT_MS}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(to);
  }
}

/*==========================================================
=            Public convenience wrappers (JS)              =
==========================================================*/

/** GET /storefront/:storeCode/categories */
export async function getCategories(storeCode) {
  const sc = resolveStoreCode(storeCode);
  return apiFetch(`storefront/${encodeURIComponent(sc)}/categories`);
}

/** GET /storefront/:storeCode/categories/:categoryId/subcategories */
export async function getSubcategories(storeCode, categoryId) {
  const sc = resolveStoreCode(storeCode);
  const cid = encodeURIComponent(String(categoryId));
  return apiFetch(`storefront/${encodeURIComponent(sc)}/categories/${cid}/subcategories`);
}

/** GET /storefront/:storeCode/products/:productId */
export async function getProductDetails(productId, storeCode) {
  const sc = resolveStoreCode(storeCode);
  const pid = encodeURIComponent(String(productId));
  return apiFetch(`storefront/${encodeURIComponent(sc)}/products/${pid}`);
}

/*==========================================================
=        (Optional) extra helpers you might want soon      =
==========================================================*/

/** GET /storefront/:storeCode/products/:productId/options */
export async function getProductOptions(productId, storeCode) {
  const sc = resolveStoreCode(storeCode);
  const pid = encodeURIComponent(String(productId));
  return apiFetch(`storefront/${encodeURIComponent(sc)}/products/${pid}/options`);
}

/** GET /storefront/:storeCode/products/:productId/pricing?hash=... */
export async function getProductPricingByHash(productId, hash, storeCode) {
  const sc = resolveStoreCode(storeCode);
  const pid = encodeURIComponent(String(productId));
  const h = encodeURIComponent(hash);
  return apiFetch(`storefront/${encodeURIComponent(sc)}/products/${pid}/pricing?hash=${h}`);
}
