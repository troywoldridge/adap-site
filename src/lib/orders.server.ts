// src/lib/orders.server.ts
import "server-only";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { and, eq, ne } from "drizzle-orm";

// Use your barrel re-exports (adjust if your paths differ)
import { carts, cartLines, orders, orderItems } from "@/lib/db/schema";

const STRIPE_KEY =
  process.env.STRIPE_SECRET_KEY ??
  (() => {
    throw new Error("Missing STRIPE_SECRET_KEY");
  })();

const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2025-07-30.basil" });

type ShippingSelection = {
  country?: "US" | "CA";
  state?: string;
  zip?: string;
  carrier?: string;
  method?: string;
  cost?: number; // dollars
  days?: number | null;
  currency?: "USD" | "CAD";
};

/**
 * Idempotently create (or fetch existing) order from a cart.
 * - De-duplicates by Stripe PaymentIntent id (stored in orders.providerId).
 * - Inserts order header + order items.
 * - Closes the cart on success.
 *
 * NOTE: Your `orders` table has no `cartId`/`sourceCartId` column,
 * so we do NOT write any cart reference into the order record.
 */
export async function ensureOrderFromCart(opts: {
  cartId: string;
  /** Stripe PaymentIntent id (stored as orders.providerId) */
  stripePaymentIntentId?: string | null;
  /** Desired order payment status; default "paid" */
  status?: "paid" | "processing" | "pending";
}): Promise<string> {
  const { cartId, stripePaymentIntentId, status = "paid" } = opts;

  // 0) If we already created an order for this PaymentIntent, return it
  if (stripePaymentIntentId) {
    const [existingByPi] =
      (await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.providerId, stripePaymentIntentId))
        .limit(1)) ?? [];
    if (existingByPi) return String(existingByPi.id);
  }

  // 1) Load cart (must be open)
  const [cartRow] =
    (await db
      .select({
        id: carts.id,
        status: carts.status,
        currency: carts.currency,
        selectedShipping: carts.selectedShipping,
        sid: carts.sid,
      })
      .from(carts)
      .where(and(eq(carts.id, cartId), ne(carts.status, "closed")))
      .limit(1)) ?? [];
  if (!cartRow) throw new Error("cart_not_found_or_closed");

  // 2) Load lines
  const lineRows =
    (await db
      .select({
        id: cartLines.id,
        productId: cartLines.productId,
        quantity: cartLines.quantity,
        unitPriceCents: cartLines.unitPriceCents,
        lineTotalCents: cartLines.lineTotalCents,
        optionIds: cartLines.optionIds,
      })
      .from(cartLines)
      .where(eq(cartLines.cartId, cartRow.id))) ?? [];
  if (lineRows.length === 0) throw new Error("empty_cart");

  // 3) Totals (authoritative cents already on lines)
  const subtotalCents = lineRows.reduce((sum, r) => {
    const qty = Number(r.quantity ?? 0);
    const unit = Number(r.unitPriceCents ?? 0);
    const line = Number.isFinite(Number(r.lineTotalCents))
      ? Number(r.lineTotalCents)
      : qty * unit;
    return sum + (Number.isFinite(line) ? line : 0);
  }, 0);

  const ship: ShippingSelection = (cartRow as any).selectedShipping ?? {};
  const shippingCents = Math.round((Number(ship?.cost) || 0) * 100);
  const taxCents = 0;
  const discountCents = 0;
  const totalCents = Math.max(0, subtotalCents + shippingCents + taxCents - discountCents);

  // 4) Insert order header (NO cartId field — your schema doesn’t have one)
  const [ins] = await db
    .insert(orders)
    .values({
      userId: cartRow.sid,                              // or your real user id if you store it
      status: "placed",
      paymentStatus: status === "paid" ? "paid" : "pending",
      provider: "stripe",
      providerId: stripePaymentIntentId ?? null,        // PI id → orders.providerId

      currency: (cartRow.currency as "USD" | "CAD") ?? "USD",
      subtotalCents,
      shippingCents,
      taxCents,
      discountCents,
      totalCents,

      placedAt: new Date().toISOString(),
    } as any)
    .returning({ id: orders.id });

  const orderId = String(ins.id);

  // 5) Insert order items (your schema exports orderItems, not orderLines)
  for (const r of lineRows) {
    await db.insert(orderItems).values({
      orderId,
      productId: Number(r.productId),
      quantity: Math.max(1, Number(r.quantity || 1)),
      unitPriceCents: Math.max(0, Number(r.unitPriceCents || 0)),
      lineTotalCents: Math.max(0, Number(r.lineTotalCents || 0)),
      optionIds: Array.isArray(r.optionIds) ? r.optionIds : [],
    } as any);
  }

  // 6) Close the cart
  await db.update(carts).set({ status: "closed" as any }).where(eq(carts.id, cartRow.id));

  return orderId;
}

/**
 * Find (or create) an order by Stripe Checkout Session id.
 * - Gets session from Stripe, reads payment_intent + metadata.cartId
 * - If an order already exists for that PI, return it
 * - Else, if we have a cartId + PI id, create the order via ensureOrderFromCart
 */
export async function findOrderIdByStripeSession(sessionId: string): Promise<string | null> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const cartId = (session.metadata?.cartId as string) || null;
    const piId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent as any)?.id || null;

    if (piId) {
      // Already created by webhook?
      const [byPi] =
        (await db
          .select({ id: orders.id })
          .from(orders)
          .where(eq(orders.providerId, piId))
          .limit(1)) ?? [];
      if (byPi) return String(byPi.id);
    }

    if (piId && cartId) {
      // Create now (idempotent against providerId)
      const id = await ensureOrderFromCart({
        cartId,
        stripePaymentIntentId: piId,
        status: "paid",
      });
      return id;
    }
  } catch {
    // swallow and return null
  }
  return null;
}
