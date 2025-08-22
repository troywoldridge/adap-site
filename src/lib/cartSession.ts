// src/lib/cartSession.ts
import { cookies } from "next/headers";

export const CART_COOKIE = "ADAP_CART_V1";

// One line item stored in the cookie cart (thumbs via Cloudflare Image ID)
export type CartLine = {
  id: string;
  productId: number;
  name: string;
  optionIds: number[];
  quantity: number;
  cloudflareImageId: string | null;
};

// The whole cookie cart. Keep it minimal; server pricing comes from SinaLite.
export type CartCookie = {
  sid?: string;
  updatedAt?: number;
  lines: CartLine[];
};

const COOKIE_OPTS = {
  path: "/",
  httpOnly: true as const,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

function normalizeCartCookie(u: unknown): CartCookie {
  const base: CartCookie = { lines: [] };
  if (!u || typeof u !== "object") {
    return base;
  }
  const obj = u as Record<string, unknown>;

  const linesRaw = obj.lines;
  const lines: CartLine[] = Array.isArray(linesRaw)
    ? linesRaw
        .map((l) => {
          if (!l || typeof l !== "object") {
            return null;
          }
          const x = l as Record<string, unknown>;
          const id = typeof x.id === "string" ? x.id : "";
          const productId = Number(x.productId);
          const name = typeof x.name === "string" ? x.name : `Product ${isFinite(productId) ? productId : ""}`;
          const optionIds = Array.isArray(x.optionIds)
            ? x.optionIds.map((n) => Number(n)).filter(Number.isFinite)
            : [];
          const quantity = Number.isFinite(Number(x.quantity)) ? Math.max(1, Math.floor(Number(x.quantity))) : 1;
          const cloudflareImageId =
            typeof x.cloudflareImageId === "string" ? x.cloudflareImageId : null;
          if (!id || !Number.isFinite(productId)) {
            return null;
          }
          return { id, productId, name, optionIds, quantity, cloudflareImageId };
        })
        .filter(Boolean) as CartLine[]
    : [];

  return {
    sid: typeof obj.sid === "string" ? obj.sid : undefined,
    updatedAt: Number.isFinite(Number(obj.updatedAt)) ? Number(obj.updatedAt) : undefined,
    lines,
  };
}

export async function getCartServer(): Promise<CartCookie> {
  const jar = await cookies(); // async in Next 14.2+
  const raw = jar.get(CART_COOKIE)?.value;
  if (!raw) {
    return { lines: [] };
  }
  try {
    return normalizeCartCookie(JSON.parse(raw));
  } catch {
    return { lines: [] };
  }
}

export async function setCartServer(partial: Partial<CartCookie>): Promise<void> {
  const jar = await cookies();
  const current = await getCartServer();
  const next = normalizeCartCookie({ ...current, ...partial, updatedAt: Date.now() });
  try {
    (jar as unknown as { set: typeof jar.set }).set(CART_COOKIE, JSON.stringify(next), COOKIE_OPTS);
  } catch {
    // no-op in read-only contexts
  }
}

export async function clearCartServer(): Promise<void> {
  const jar = await cookies();
  try {
    (jar as unknown as { set: typeof jar.set }).set(CART_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 });
  } catch {}
}
