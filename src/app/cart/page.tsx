export const dynamic = "force-dynamic";

import CartPageClient from "./CartPageClient";
import type { CartItem } from "@/components/CartLineItem";
import type { ShippingRate } from "@/components/CartShippingEstimator";
import { headers, cookies } from "next/headers";

type Currency = "USD" | "CAD";

type ApiEnvelope = {
  ok: true;
  items: Array<{
    id: string;
    productId: number;
    quantity: number;
    optionIds: number[];
    unitPrice?: number;
    lineTotal?: number;
    name?: string | null;
    image?: string | null; // Cloudflare Image Delivery id
  }>;
  subtotal: number;
  currency: Currency;
  selectedShipping: ShippingRate | null;
};

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

async function fetchCart(): Promise<{
  items: CartItem[];
  currency: Currency;
  initialShipping: ShippingRate | null;
}> {
  const url = `${await baseUrl()}/api/cart/current`;

  // forward cookies so the API sees the same session
  const jar = await cookies();
  const cookieHeader = jar.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  const res = await fetch(url, {
    cache: "no-store",
    headers: { cookie: cookieHeader, accept: "application/json" },
  });

  if (!res.ok) return { items: [], currency: "USD", initialShipping: null };

  const json = (await res.json()) as ApiEnvelope | any;
  if (!json?.ok) return { items: [], currency: "USD", initialShipping: null };

  const items: CartItem[] = (json.items ?? []).map((it: any) => ({
    id: it.id,
    productId: it.productId,
    name: it.name ?? `Product ${it.productId}`,
    optionIds: Array.isArray(it.optionIds) ? it.optionIds : [],
    quantity: Number.isFinite(it.quantity) ? it.quantity : 1,
    cloudflareImageId: it.image ?? null, // 🔥 Cloudflare Images delivery
    serverUnitPrice: typeof it.unitPrice === "number" ? it.unitPrice : undefined,
  }));

  const currency: Currency = json.currency === "CAD" ? "CAD" : "USD";
  const initialShipping: ShippingRate | null = json.selectedShipping ?? null;

  return { items, currency, initialShipping };
}

export default async function CartPage() {
  const { items, currency, initialShipping } = await fetchCart();
  const store = currency === "CAD" ? "CA" : "US";

  return (
    <CartPageClient
      initialItems={items}
      currency={currency}
      store={store}
      initialShipping={initialShipping}
    />
  );
}
