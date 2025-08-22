export const dynamic = "force-dynamic";

import CartPageClient from "./CartPageClient";
import type { CartItem } from "@/components/CartLineItem";
import { headers as headersAsync, cookies as cookiesAsync } from "next/headers";

type ApiCart = {
  id: string;
  currency: "USD" | "CAD";
  subtotal: number;
  items: Array<{
    id: string;
    productId: number;
    quantity: number;
    optionIds: number[];
    unitPrice?: number;
    name?: string | null;
    image?: string | null;        // Cloudflare image id
  }>;
};

type ApiResponse = { ok: true; cart: ApiCart } | { ok: false; error: string };

function baseUrlFromHeaders(h: Headers): string {
  // Node fetch on the server needs an absolute URL
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function fetchCart(): Promise<{ items: CartItem[]; currency: "USD" | "CAD" }> {
  const h = await headersAsync();
  const url = `${baseUrlFromHeaders(h)}/api/cart`;

  const jar = await cookiesAsync();
  const cookieHeader = jar.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  const res = await fetch(url, { cache: "no-store", headers: { cookie: cookieHeader } });
  if (!res.ok) return { items: [], currency: "USD" };

  const json = (await res.json()) as ApiResponse;
  if (!("ok" in json) || !json.ok) return { items: [], currency: "USD" };

  const cart = json.cart;

  const items: CartItem[] = (cart.items ?? []).map((it) => ({
    id: it.id,
    productId: it.productId,
    name: it.name ?? `Product ${it.productId}`,
    optionIds: Array.isArray(it.optionIds) ? it.optionIds : [],
    quantity: Number.isFinite(it.quantity) ? it.quantity : 1,
    cloudflareImageId: it.image ?? null,                      // ← CF id
    serverUnitPrice: typeof it.unitPrice === "number" ? it.unitPrice : undefined,
  }));

  const currency: "USD" | "CAD" = cart.currency === "CAD" ? "CAD" : "USD";
  return { items, currency };
}

export default async function CartPage() {
  const { items, currency } = await fetchCart();
  const store = currency === "CAD" ? "CA" : "US";
  return (
    <main className="container cart-container">
      <CartPageClient initialItems={items} currency={currency} store={store} />
    </main>
  );
}
