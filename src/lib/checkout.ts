// lib/checkout.ts (or keep in your webhook file if you prefer)
import { db } from "@/lib/db";
import { and, eq, ne } from "drizzle-orm";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { cartCredits } from "@/db/schema/cartCredit";
import { orders } from "@/db/schema/orders";

async function loadOpenCartByRef(ref: { cartId?: string | null; sid?: string | null }) {
  if (ref.cartId) {
    const [row] =
      (await db
        .select({
          id: carts.id,
          status: carts.status,
          currency: carts.currency,
          selectedShipping: carts.selectedShipping,
          sid: carts.sid,
        })
        .from(carts)
        .where(and(eq(carts.id, ref.cartId), ne(carts.status, "closed")))
        .limit(1)) ?? [];
    if (row) return row;
  }
  if (ref.sid) {
    const [row] =
      (await db
        .select({
          id: carts.id,
          status: carts.status,
          currency: carts.currency,
          selectedShipping: carts.selectedShipping,
          sid: carts.sid,
        })
        .from(carts)
        .where(and(eq(carts.sid, ref.sid), ne(carts.status, "closed")))
        .limit(1)) ?? [];
    if (row) return row;
  }
  return null;
}

async function computeCartTotalsCents(cartRow: {
  id: string;
  currency: "USD" | "CAD" | string | null;
  selectedShipping: { cost?: number | string | null } | null;
}) {
  const rows = await db
    .select({
      quantity: cartLines.quantity,
      unitPriceCents: cartLines.unitPriceCents,
      lineTotalCents: cartLines.lineTotalCents,
    })
    .from(cartLines)
    .where(eq(cartLines.cartId, cartRow.id));

  const subtotalCents = rows.reduce((sum, r) => {
    const qty = Number(r.quantity ?? 0);
    const unit = Number(r.unitPriceCents ?? 0);
    const line = Number.isFinite(Number(r.lineTotalCents)) ? Number(r.lineTotalCents) : qty * unit;
    return sum + (Number.isFinite(line) ? line : 0);
  }, 0);

  const shipCents = Math.round(Number(cartRow?.selectedShipping?.cost ?? 0) * 100) || 0;
  const taxCents = 0; // add tax when ready

  // pull applied loyalty credits for this cart (in cents)
  const { getCartCreditsCents } = await import("@/lib/cartCredits");
  const creditsCents = await getCartCreditsCents(cartRow.id);

  const totalCents = Math.max(0, subtotalCents + shipCents + taxCents - creditsCents);
  const ordersCurrency = (String(cartRow.currency || "USD").toUpperCase() as "USD" | "CAD");

  return { subtotalCents, shipCents, taxCents, creditsCents, totalCents, ordersCurrency };
}

/**
 * Create a PAID order for the given cart ref (Stripe success path).
 * Idempotent by providerId (PI id) OR cartId (already closed/placed).
 */
export async function finalizePaidOrderFromCartRef(ref: {
  piId?: string;
  sid?: string | null;
  cartId?: string | null;
}) {
  // 1) Resolve cart (open only)
  const cart = await loadOpenCartByRef({ cartId: ref.cartId ?? null, sid: ref.sid ?? null });
  if (!cart) return null;

  // 2) Authoritative totals (incl. credits)
  const { subtotalCents, shipCents, taxCents, creditsCents, totalCents, ordersCurrency } =
    await computeCartTotalsCents(cart);

  // 3) Extra idempotency: if an order already exists for this cart OR PI, bail
  const existingByCart = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.cartId, cart.id))
    .limit(1);

  if (existingByCart.length) {
    // cart already converted to order
    return { orderId: existingByCart[0].id, already: true };
  }

  if (ref.piId) {
    const existingByPi = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.providerId, ref.piId))
      .limit(1);
    if (existingByPi.length) {
      return { orderId: existingByPi[0].id, already: true };
    }
  }

  // 4) Insert order, close cart, clear credits (atomic)
  const result = await db.transaction(async (tx) => {
    // NOTE: if you add userId to carts in the future, use that here.
    const safeUserId = cart.sid;

    const [order] = await tx
      .insert(orders)
      .values({
        userId: safeUserId,
        cartId: cart.id,
        status: "placed",
        paymentStatus: "paid",
        provider: "stripe",
        providerId: ref.piId ?? null,

        currency: ordersCurrency,
        subtotalCents,
        shippingCents: shipCents,
        taxCents,
        discountCents: creditsCents, // roll-up discount
        creditsCents,                // loyalty bucket (explicit)
        totalCents,

        placedAt: new Date().toISOString(),
      } as any)
      .returning();

    await tx.update(carts).set({ status: "closed" }).where(eq(carts.id, cart.id));
    await tx.delete(cartCredits).where(eq(cartCredits.cartId, cart.id));

    return { orderId: order.id };
  });

  return result; // { orderId }
}
