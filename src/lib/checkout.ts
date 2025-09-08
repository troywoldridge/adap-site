// src/lib/checkout.ts
import { db } from "@/lib/db";
import { and, eq, ne, sql } from "drizzle-orm";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { cartCredits } from "@/db/schema/cartCredits"; // <- your existing singular file
import { orders } from "@/db/schema/orders";
import { loyaltyWallets, loyaltyTransactions } from "@/db/schema/loyalty"; // <- add this

// Load an open cart by cartId or sid
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
          // If you have carts.userId in your schema, include it (otherwise it's fine)
          // @ts-ignore
          userId: (carts as any).userId,
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
          // @ts-ignore
          userId: (carts as any).userId,
        })
        .from(carts)
        .where(and(eq(carts.sid, ref.sid), ne(carts.status, "closed")))
        .limit(1)) ?? [];
    if (row) return row;
  }
  return null;
}

// Recompute authoritative totals for a cart (incl. loyalty credits)
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
  const taxCents = 0; // add tax calc later

  // applied loyalty credits (cents)
  const { getCartCreditsCents } = await import("@/lib/cartCredits");
  const creditsCents = await getCartCreditsCents(cartRow.id);

  const totalCents = Math.max(0, subtotalCents + shipCents + taxCents - creditsCents);
  const ordersCurrency = (String(cartRow.currency || "USD").toUpperCase() as "USD" | "CAD");

  return { subtotalCents, shipCents, taxCents, creditsCents, totalCents, ordersCurrency };
}

/**
 * Create a PAID order for the given cart ref (Stripe success path).
 * Idempotent by providerId (PI id) and by cartId→order guard.
 *
 * NOTE: Shipments/status are synced via your backend against the SinaLite API
 * documentation. This function focuses on local order creation + loyalty earn.
 */
export async function finalizePaidOrderFromCartRef(ref: {
  piId?: string;
  sid?: string | null;
  cartId?: string | null;
}) {
  // 1) Resolve cart (only if still open)
  const cart = await loadOpenCartByRef({ cartId: ref.cartId ?? null, sid: ref.sid ?? null });
  if (!cart) return null;

  // 2) Authoritative totals (incl. credits)
  const { subtotalCents, shipCents, taxCents, creditsCents, totalCents, ordersCurrency } =
    await computeCartTotalsCents(cart);

  // 3) Idempotency guards
  const existingByCart = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.cartId, cart.id))
    .limit(1);
  if (existingByCart.length) {
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

  // 4) Insert order, LOYALTY EARN, close cart, clear credits — all atomic
  const result = await db.transaction(async (tx) => {
    // Prefer a real userId if your carts table has it; fallback to sid for guest
    const safeUserId: string | null = (cart as any).userId || cart.sid || null;

    const [order] = await tx
      .insert(orders)
      .values({
        userId: safeUserId ?? "", // keep non-null
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
        creditsCents,                // explicit loyalty bucket
        totalCents,

        placedAt: new Date().toISOString(),
      } as any)
      .returning();

    // 🎁 LOYALTY EARN — 100 pts = $1 → 1 pt per $1
    // Keep this aligned with your redemption ratio & SinaLite flow.
    const EARN_RATE_POINTS_PER_DOLLAR = 1;
    const earnableCents = Math.max(0, subtotalCents + shipCents + taxCents - creditsCents);
    const earnPoints = Math.floor(earnableCents / 100) * EARN_RATE_POINTS_PER_DOLLAR;

    if (earnPoints > 0 && safeUserId) {
      // Upsert the wallet by customerId (TEXT)
      await tx
        .insert(loyaltyWallets)
        .values({ customerId: safeUserId, pointsBalance: 0 })
        .onConflictDoNothing({ target: loyaltyWallets.customerId });

      const [{ id: walletId }] =
        (await tx
          .select({ id: loyaltyWallets.id })
          .from(loyaltyWallets)
          .where(eq(loyaltyWallets.customerId, safeUserId))
          .limit(1)) ?? [];

      // Insert the earn transaction
      await tx.insert(loyaltyTransactions).values({
        walletId,
        customerId: safeUserId,
        type: "earn",
        pointsDelta: earnPoints,
        orderId: String(order.id),
        note: "Order placed",
      } as any);

      // Increment the wallet
      await tx
        .update(loyaltyWallets)
        .set({
          pointsBalance: sql`${loyaltyWallets.pointsBalance} + ${earnPoints}`,
          lifetimeEarned: sql`${loyaltyWallets.lifetimeEarned} + ${earnPoints}`,
          updatedAt: new Date(),
        } as any)
        .where(eq(loyaltyWallets.id, walletId));
    }

    // Close cart
    await tx.update(carts).set({ status: "closed" }).where(eq(carts.id, cart.id));

    // Clear any per-cart credits rows (if table exists in your app)
    try {
      await tx.delete(cartCredits).where(eq(cartCredits.cartId, cart.id));
    } catch {
      // ignore if you don’t maintain a cartCredits table
    }

    return { orderId: order.id, earned: earnPoints || 0 };
  });

  return result; // { orderId, earned }
}
