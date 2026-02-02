import "server-only";

import { and, eq, ne } from "drizzle-orm";

import { dbClient as db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { cartCredits } from "@/db/schema/cartCredits";
import { orders } from "@/db/schema/orders";
import { getCartCreditsCents } from "@/lib/cartCredits";

type Db = typeof db;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

function toInt(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function shipCentsFromSelectedShipping(selectedShipping: unknown): number {
  // selectedShipping is usually JSON (cost in dollars)
  const anyShip = selectedShipping as any;
  const cost = anyShip?.cost ?? anyShip?.rate?.cost ?? anyShip?.price ?? 0;
  const dollars = Number(cost);
  if (!Number.isFinite(dollars) || dollars <= 0) return 0;
  return Math.round(dollars * 100);
}

async function computeCartSubtotalCents(cartId: string, tx?: Tx): Promise<number> {
  const database = tx ?? db;
  const rows = await database
    .select({
      quantity: cartLines.quantity,
      unitPriceCents: cartLines.unitPriceCents,
      lineTotalCents: cartLines.lineTotalCents,
    })
    .from(cartLines)
    .where(eq(cartLines.cartId, cartId));

  return rows.reduce((sum: number, r) => {
    const qty = toInt(r.quantity, 0);
    const unit = toInt(r.unitPriceCents, 0);
    const line = Number.isFinite(Number(r.lineTotalCents)) ? toInt(r.lineTotalCents, qty * unit) : qty * unit;
    return sum + (Number.isFinite(line) ? line : 0);
  }, 0);
}

/**
 * Finalize a $0 checkout (credits cover entire total) by SID.
 * This is used when you don't want to create a Stripe PaymentIntent.
 *
 * Returns orderId when finalized, otherwise null (not free or no open cart).
 */
export async function finalizeFreeOrderBySid(args: {
  sid: string;
  // Optional: if you already computed totals upstream, pass it for safety checks
  expectedTotalCents?: number | null;
  // Optional: set userId if you want to claim the cart/order to a logged-in user
  userId?: string | null;
}): Promise<string | null> {
  const sid = String(args.sid || "").trim();
  if (!sid) return null;

  // Find open cart for sid
  const [cart] = await db
    .select({
      id: carts.id,
      sid: carts.sid,
      userId: carts.userId,
      status: carts.status,
      currency: carts.currency,
      selectedShipping: carts.selectedShipping,
    })
    .from(carts)
    .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
    .limit(1);

  if (!cart) return null;

  const shipCents = shipCentsFromSelectedShipping(cart.selectedShipping);
  const subtotalCents = await computeCartSubtotalCents(cart.id);
  const creditsCents = await getCartCreditsCents(cart.id);

  // Tax is handled elsewhere in your stack; for free orders we keep it conservative here.
  const taxCents = 0;

  const totalCents = Math.max(0, subtotalCents + shipCents + taxCents - creditsCents);

  if (typeof args.expectedTotalCents === "number" && args.expectedTotalCents >= 0) {
    // If upstream thought it was free but we compute non-free, do not finalize.
    if (totalCents !== args.expectedTotalCents && totalCents > 0) return null;
  }

  // Only finalize if truly free
  if (totalCents > 0) return null;

  const safeUserId = (args.userId ?? null) || cart.userId || cart.sid;
  const currency = (String(cart.currency || "USD").toUpperCase() === "CAD" ? "CAD" : "USD") as "USD" | "CAD";

  const res = await db.transaction(async (tx) => {
    // Idempotency: if an order already exists for this cart, reuse it
    const existing = await tx.select({ id: orders.id }).from(orders).where(eq(orders.cartId, cart.id)).limit(1);
    if (existing.length > 0) return String(existing[0].id);

    const [order] = await tx
      .insert(orders)
      .values({
        userId: safeUserId,
        cartId: cart.id,
        status: "placed",
        paymentStatus: "paid",
        provider: "free",
        providerId: null,

        currency,
        subtotalCents,
        shippingCents: shipCents,
        taxCents,
        discountCents: creditsCents,
        creditsCents,
        totalCents,

        placedAt: new Date().toISOString(),
      } as any)
      .returning({ id: orders.id });

    await tx.update(carts).set({ status: "closed" as any, userId: safeUserId as any }).where(eq(carts.id, cart.id));
    await tx.delete(cartCredits).where(eq(cartCredits.cartId, cart.id));

    return String(order.id);
  });

  return res;
}
