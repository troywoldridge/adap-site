// src/app/api/stripe/webhook/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe"; // ✅ use centralized client

import { db } from "@/lib/db";
import { and, eq, ne } from "drizzle-orm";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { cartCredits } from "@/db/schema/cartCredits";
import { orders } from "@/db/schema/orders";
import { getCartCreditsCents } from "@/lib/cartCredits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ------------------------- Strict envs ------------------------- */
const STRIPE_WEBHOOK_SECRET: string =
  process.env.STRIPE_WEBHOOK_SECRET ??
  (() => {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  })();

/* --------------------- Helpers: cart & totals ------------------- */
// ... (no changes to your helper fns)

/* --------------------- Helpers: cart & totals ------------------- */
async function loadOpenCartByRef(ref: { cartId?: string | null; sid?: string | null }) {
  const { cartId, sid } = ref;

  if (cartId) {
    const [byId] =
      (await db
        .select({
          id: carts.id,
          status: carts.status,
          currency: carts.currency,
          selectedShipping: carts.selectedShipping,
          sid: carts.sid,
          userId: carts.userId, // ✅ include real user id if present
        })
        .from(carts)
        .where(and(eq(carts.id, cartId), ne(carts.status, "closed")))
        .limit(1)) ?? [];
    if (byId) return byId;
  }

  if (sid) {
    const [bySid] =
      (await db
        .select({
          id: carts.id,
          status: carts.status,
          currency: carts.currency,
          selectedShipping: carts.selectedShipping,
          sid: carts.sid,
          userId: carts.userId, // ✅ include real user id if present
        })
        .from(carts)
        .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
        .limit(1)) ?? [];
    if (bySid) return bySid;
  }

  return null;
}

/** Compute cents from cart rows on the server (authoritative). */
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
  const taxCents = 0; // TODO: hook up tax when ready
  const creditsCents = await getCartCreditsCents(cartRow.id);

  const totalCents = Math.max(0, subtotalCents + shipCents + taxCents - creditsCents);

  const ordersCurrency = String(cartRow.currency || "USD").toUpperCase() as "USD" | "CAD";
  const stripeCurrency = (ordersCurrency === "CAD" ? "cad" : "usd") as "usd" | "cad";

  return { subtotalCents, shipCents, taxCents, creditsCents, totalCents, ordersCurrency, stripeCurrency };
}

/* ----------------- Idempotent order finalizer ------------------- */
/**
 * Create (or fetch existing) order for a paid Stripe event.
 * Idempotency keys: providerId (PI id) and cartId.
 */
async function finalizePaidOrderFromCartRef(args: {
  piId?: string | null;
  sessionId?: string | null;
  sid?: string | null;
  cartId?: string | null;
}) {
  const { piId, cartId, sid } = args;

  // 1) If an order already exists for this PI, return early
  if (piId) {
    const existing = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.providerId, piId))
      .limit(1);
    if (existing.length > 0) return String(existing[0].id);
  }

  // 2) If we already created an order for this cart, return it
  if (cartId) {
    const existingByCart = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.cartId, cartId))
      .limit(1);
    if (existingByCart.length > 0) return String(existingByCart[0].id);
  }

  // 3) Load the open cart (by cartId or sid)
  const cart = await loadOpenCartByRef({ cartId: cartId ?? null, sid: sid ?? null });
  if (!cart) {
    // Nothing to do — either already closed or missing; treat as success
    return null;
  }

  // 4) Recompute totals (authoritative)
  const { subtotalCents, shipCents, taxCents, creditsCents, totalCents, ordersCurrency } =
    await computeCartTotalsCents(cart);

  // 5) Insert order & close cart + clear credits (transaction)
  const result = await db.transaction(async (tx) => {
    // ✅ prefer real user if available, otherwise fall back to guest SID
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
        // Optional: stripeSessionId: args.sessionId ?? null,

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

/* ------------------------- Webhook handler ---------------------- */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err?.message);
    return NextResponse.json({ ok: false, error: "bad_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const sid = pi.metadata?.sid ?? null;
        const cartId = pi.metadata?.cartId ?? null;
        await finalizePaidOrderFromCartRef({ piId: pi.id, sid, cartId });
        return NextResponse.json({ ok: true });
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const sid = (session.metadata?.sid as string) ?? null;
        const cartId = (session.metadata?.cartId as string) ?? null;

        const piId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent as any)?.id ?? null;

        await finalizePaidOrderFromCartRef({
          piId: piId ?? null,
          sessionId: session.id,
          sid,
          cartId,
        });

        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ ok: true, ignored: event.type });
    }
  } catch (e: any) {
    console.error("webhook handler failed:", e);
    // 200 so Stripe retries on its schedule (safer than 500 loops)
    return NextResponse.json({ ok: false, error: String(e?.message || e) });
  }
}
