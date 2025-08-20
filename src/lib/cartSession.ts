// src/lib/cartSession.ts
import { cookies } from "next/headers";
import crypto from "node:crypto";

export type CartLine = {
  id: string;
  productId: number;
  name: string;
  optionIds: number[];
  quantity: number;
  cloudflareImageId?: string | null;
};
export type Cart = { id: string; currency: "USD" | "CAD"; lines: CartLine[] };

const COOKIE = "ADAP_CART_V1";

export function getCartServer(): Cart {
  const c = cookies().get(COOKIE)?.value;
  if (!c) {
    const cart: Cart = { id: crypto.randomUUID(), currency: "USD", lines: [] };
    cookies().set(COOKIE, JSON.stringify(cart), { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
    return cart;
  }
  try {
    const parsed = JSON.parse(c);
    // sanity
    if (!parsed?.id) parsed.id = crypto.randomUUID();
    if (!Array.isArray(parsed?.lines)) parsed.lines = [];
    if (parsed?.currency !== "USD" && parsed?.currency !== "CAD") parsed.currency = "USD";
    return parsed as Cart;
  } catch {
    const cart: Cart = { id: crypto.randomUUID(), currency: "USD", lines: [] };
    cookies().set(COOKIE, JSON.stringify(cart), { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
    return cart;
  }
}

export function setCartServer(cart: Cart) {
  cookies().set(COOKIE, JSON.stringify(cart), { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
}
