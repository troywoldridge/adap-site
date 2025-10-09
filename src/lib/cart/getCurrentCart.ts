// src/lib/cart/getCurrentCart.ts
import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

// Adjust these to your actual schema paths
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";

export type CartResponse = {
  ok: boolean;
  items: any[];
  subtotalCents?: number;
  cartId?: string | null;
  error?: string;
};

/** Handle Next 14 (sync) and Next 15 (async) cookies() */
async function getCookieStore() {
  const maybe = cookies() as any;
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

export async function getCurrentCart(): Promise<CartResponse> {
  const cookieStore = await getCookieStore();
  const cartId: string | null = cookieStore.get("cartId")?.value ?? null;

  if (!cartId) return { ok: true, items: [], subtotalCents: 0, cartId: null };

  // Confirm the cart exists
  const [cart] = await db.select().from(carts).where(eq(carts.id, cartId)).limit(1);
  if (!cart) return { ok: true, items: [], subtotalCents: 0, cartId };

  // Load lines for that cart
  const lines = await db.select().from(cartLines).where(eq(cartLines.cartId, cartId));

  // Compute subtotal in cents (adjust field names if yours differ)
  const subtotalCents = (lines as any[]).reduce((sum, l) => {
    const lineTotal =
      (typeof l.totalCents === "number" ? l.totalCents : 0) ||
      (typeof l.unitPriceCents === "number" && typeof l.quantity === "number"
        ? l.unitPriceCents * l.quantity
        : 0);
    return sum + lineTotal;
  }, 0);

  return { ok: true, items: lines, subtotalCents, cartId };
}
