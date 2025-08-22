// src/lib/cart-client.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

export type AddLineInput = {
  productId: number;
  optionIds: number[];
  quantity: number;
  name?: string;
  cloudflareImageId?: string | null;
};

export async function addToCart(input: AddLineInput) {
  const res = await fetch("/api/cart/lines", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `addToCart failed: ${res.status}`);
  }
  return json;
}

export async function updateLineQuantity(lineId: string, quantity: number) {
  const res = await fetch(`/api/cart/lines/${encodeURIComponent(lineId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ quantity }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `updateLineQuantity failed: ${res.status}`);
  }
  return json;
}

export async function removeLine(lineId: string) {
  const res = await fetch(`/api/cart/lines/${encodeURIComponent(lineId)}`, {
    method: "DELETE",
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `removeLine failed: ${res.status}`);
  }
  return json;
}

export async function getCart() {
  const res = await fetch("/api/cart", { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `getCart failed: ${res.status}`);
  }
  return json;
}
