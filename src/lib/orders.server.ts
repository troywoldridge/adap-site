import "server-only";

import Stripe from "stripe";
import { and, eq, ne } from "drizzle-orm";
import { dbClient as db } from "@/lib/db";
import { carts, cartLines, orders, orderItems } from "@/db/schema";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");

  return new Stripe(key, { apiVersion: "2025-07-30.basil" });
}

type ShippingSelection = {
  country?: "US" | "CA";
  state?: string;
  zip?: string;
  carrier?: string;
  method?: string;
  cost?: number;
  days?: number | null;
  currency?: "USD" | "CAD";
};

export async function ensureOrderFromCart(opts: {
  cartId: string;
  stripePaymentIntentId?: string | null;
  status?: "paid" | "processing" | "pending";
}): Promise<string> {
  const database = db;
  const { cartId, stripePaymentIntentId, status = "paid" } = opts;

  if (stripePaymentIntentId) {
    const [existing] =
      (await database
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.providerId, stripePaymentIntentId))
        .limit(1)) ?? [];
    if (existing) return String(existing.id);
  }

  const [cartRow] =
    (await database
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

  const lineRows =
    (await database
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

  const subtotalCents = lineRows.reduce((sum, r) => {
    const line =
      Number.isFinite(Number(r.lineTotalCents))
        ? Number(r.lineTotalCents)
        : Number(r.quantity || 0) * Number(r.unitPriceCents || 0);
    return sum + (Number.isFinite(line) ? line : 0);
  }, 0);

  const ship: ShippingSelection = (cartRow as any).selectedShipping ?? {};
  const shippingCents = Math.round((Number(ship.cost) || 0) * 100);

  const [ins] = await database
    .insert(orders)
    .values({
      userId: cartRow.sid,
      status: "placed",
      paymentStatus: status === "paid" ? "paid" : "pending",
      provider: "stripe",
      providerId: stripePaymentIntentId ?? null,
      currency: (cartRow.currency as "USD" | "CAD") ?? "USD",
      subtotalCents,
      shippingCents,
      taxCents: 0,
      discountCents: 0,
      totalCents: Math.max(0, subtotalCents + shippingCents),
      placedAt: new Date().toISOString(),
    } as any)
    .returning({ id: orders.id });

  const orderId = String(ins.id);

  for (const r of lineRows) {
    await database.insert(orderItems).values({
      orderId,
      productId: Number(r.productId),
      quantity: Math.max(1, Number(r.quantity || 1)),
      unitPriceCents: Math.max(0, Number(r.unitPriceCents || 0)),
      lineTotalCents: Math.max(0, Number(r.lineTotalCents || 0)),
      optionIds: Array.isArray(r.optionIds) ? r.optionIds : [],
    } as any);
  }

  await database
    .update(carts)
    .set({ status: "closed" as any })
    .where(eq(carts.id, cartRow.id));

  return orderId;
}

export async function findOrderIdByStripeSession(
  sessionId: string,
): Promise<string | null> {
  try {
    const stripe = getStripe();
    const database = db;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const cartId = (session.metadata?.cartId as string) || null;
    const piId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent as any)?.id || null;

    if (piId) {
      const [byPi] =
        (await database
          .select({ id: orders.id })
          .from(orders)
          .where(eq(orders.providerId, piId))
          .limit(1)) ?? [];
      if (byPi) return String(byPi.id);
    }

    if (piId && cartId) {
      return await ensureOrderFromCart({
        cartId,
        stripePaymentIntentId: piId,
        status: "paid",
      });
    }
  } catch {
    /* swallow */
  }

  return null;
}
