// src/app/api/cart/lines/route.ts
import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { getCartServer, setCartServer, type CartLine } from "@/lib/cartSession";

export async function POST(req: NextRequest) {
  const { productId, name, optionIds, quantity, cloudflareImageId } = await req.json();
  const pid = Number(productId);
  const qty = Number(quantity || 1);
  if (!Number.isFinite(pid) || !Array.isArray(optionIds) || optionIds.length === 0) {
    return Response.json({ ok: false, error: "productId, optionIds[] required" }, { status: 400 });
  }
  const cart = getCartServer();
  const line: CartLine = {
    id: crypto.randomUUID(),
    productId: pid,
    name: String(name || `Product ${pid}`),
    optionIds: optionIds.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n)),
    quantity: Math.max(1, Math.min(9999, qty)),
    cloudflareImageId: cloudflareImageId ?? null,
  };
  cart.lines.push(line);
  setCartServer(cart);
  return Response.json({ ok: true, cart, line });
}
