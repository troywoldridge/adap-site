import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { cartCredits } from "@/db/schema/cartCredits";
import { orders } from "@/db/schema/orders";
import { getCartCreditsCents } from "@/lib/cartCredits";

/** Load the open cart from either cartId or sid */
async function loadOpenCartByRef(ref: { cartId?: string | null; sid?: string | null }) {
  const { cartId, sid } = ref;

  if (cartId) {
    const rows = await db
      .select({
        id: carts.id,
        status: carts.status,
        currency: carts.currency,
        selectedShipping: carts.selectedShipping,
        sid: carts.sid,
        userId: carts.userId,
      })
      .from(carts)
      .where(and(eq(carts.id, cartId), ne(carts.status, "closed")))
      .limit(1);
    if (rows[0]) return rows[0];
  }

  if (sid) {
    const rows = await db
      .select({
        id: carts.id,
        status: carts.status,
        currency: carts.currency,
        selectedShipping: carts.selectedShipping,
        sid: carts.sid,
        userId: carts.userId,
      })
      .from(carts)
      .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
      .limit(1);
    if (rows[0]) return rows[0];
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
  const taxCents = 0;
  const creditsCents = await getCartCreditsCents(cartRow.id);

  const totalCents = Math.max(0, subtotalCents + shipCents + taxCents - creditsCents);
  const ordersCurrency = String(cartRow.currency || "USD").toUpperCase() as "USD" | "CAD";

  return { subtotalCents, shipCents, taxCents, creditsCents, totalCents, ordersCurrency };
}

/** Idempotently create an order & close the cart */
export async function finalizePaidOrderFromCartRef(args: {
  piId?: string | null;
  sessionId?: string | null;
  sid?: string | null;
  cartId?: string | null;
}) {
  const { piId, cartId, sid } = args;

  // If already have an order for this PI, return it
  if (piId) {
    const existing = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.providerId, piId))
      .limit(1);
    if (existing.length > 0) return String(existing[0].id);
  }

  // If an order already exists for this cart, return it
  if (cartId) {
    const existingByCart = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.cartId, cartId))
      .limit(1);
    if (existingByCart.length > 0) return String(existingByCart[0].id);
  }

  // Load open cart
  const cart = await loadOpenCartByRef({ cartId: cartId ?? null, sid: sid ?? null });
  if (!cart) return null;

  // Compute totals
  const { subtotalCents, shipCents, taxCents, creditsCents, totalCents, ordersCurrency } =
    await computeCartTotalsCents(cart);

  // Tx: create order, close cart, clear credits
  const result = await db.transaction(async (tx) => {
    const safeUserId = (cart as any).userId ?? cart.sid;

    const [order] = await tx
      .insert(orders)
      .values({
        userId: safeUserId,
        cartId: cart.id,
        status: "placed",
        paymentStatus: "paid",
        provider: "stripe",
        providerId: piId ?? null,
        currency: ordersCurrency,
        subtotalCents,
        shippingCents: shipCents,
        taxCents,
        discountCents: creditsCents,
        creditsCents,
        totalCents,
        placedAt: new Date().toISOString(),
      } as any)
      .returning({ id: orders.id });

    await tx.update(carts).set({ status: "closed" as any }).where(eq(carts.id, cart.id));
    await tx.delete(cartCredits).where(eq(cartCredits.cartId, cart.id));

    return { orderId: String(order.id) };
  });

  return result.orderId;
}
