import "server-only";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { db } from "@/lib/db";
import { and, eq, ne } from "drizzle-orm";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { cartCredits } from "@/db/schema/cartCredit";
import { orders } from "@/db/schema/orders";
import { getCartCreditsCents } from "@/lib/cartCredits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Strict envs
const STRIPE_KEY: string =
  process.env.STRIPE_SECRET_KEY ??
  (() => {
    throw new Error("Missing STRIPE_SECRET_KEY");
  })();

const STRIPE_WEBHOOK_SECRET: string =
  process.env.STRIPE_WEBHOOK_SECRET ??
  (() => {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  })();

const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2025-07-30.basil" });

/** Utility: load cart (by cartId preferred, else by sid), ensure not closed */
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
        })
        .from(carts)
        .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
        .limit(1)) ?? [];
    if (bySid) return bySid;
  }

  return null;
}

/** Utility: compute money (cents) from cart + lines + credits */
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
    const line = Number.isFinite(Number(r.lineTotalCents))
      ? Number(r.lineTotalCents)
      : qty * unit;
    return sum + (Number.isFinite(line) ? line : 0);
  }, 0);

  const shipCents = Math.round(Number(cartRow?.selectedShipping?.cost ?? 0) * 100) || 0;
  const taxCents = 0; // plug in your tax calc when ready
  const creditsCents = await getCartCreditsCents(cartRow.id);

  const totalCents = Math.max(0, subtotalCents + shipCents + taxCents - creditsCents);

  // Stripe currency wants lowercase ('usd'/'cad'), orders table stores 3-char code
  const ordersCurrency = (String(cartRow.currency || "USD").toUpperCase() as "USD" | "CAD");
  const stripeCurrency = (ordersCurrency === "CAD" ? "cad" : "usd") as "usd" | "cad";

  return { subtotalCents, shipCents, taxCents, creditsCents, totalCents, ordersCurrency, stripeCurrency };
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 400 });
  }

  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err?.message);
    return NextResponse.json({ ok: false, error: "bad_signature" }, { status: 400 });
  }

  try {
    // 🚩 We primarily care about Payment Element flow
    // src/app/api/stripe/webhook/route.ts
// (Only showing the inside of POST; keep the signature verification you already have)

if (event.type === "payment_intent.succeeded") {
  const pi = event.data.object as Stripe.PaymentIntent;
  const sid = pi.metadata?.sid ?? null;
  const cartId = pi.metadata?.cartId ?? null;
  await finalizePaidOrderFromCartRef({ piId: pi.id, sid, cartId });
  return NextResponse.json({ ok: true });
}

if (event.type === "checkout.session.completed") {
  const session = event.data.object as Stripe.Checkout.Session;
  const sid = (session.metadata?.sid as string) ?? null;
  const cartId = (session.metadata?.cartId as string) ?? null;

  // Get the PI id (could be string or null)
  const piId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent as any)?.id ?? null;

  await finalizePaidOrderFromCartRef({ piId: piId ?? undefined, sid, cartId });
  return NextResponse.json({ ok: true });
}


      // Idempotency: if we already recorded an order for this PI, exit early
      const existing = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.providerId, pi.id))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json({ ok: true, idempotent: true });
      }

      const cart = await loadOpenCartByRef({ cartId, sid });
      if (!cart) {
        // Cart already closed or missing—treat as idempotent success
        return NextResponse.json({ ok: true, note: "cart_not_found_or_closed" });
      }

      // Recompute server totals (authoritative)
      const { subtotalCents, shipCents, taxCents, creditsCents, totalCents, ordersCurrency } =
        await computeCartTotalsCents(cart);

      // Optional safety: warn if mismatch with Stripe amount
      if (typeof pi.amount === "number" && pi.amount !== totalCents) {
        console.warn(
          `Amount mismatch: PI=${pi.amount}, server=${totalCents}, cart=${cart.id}`
        );
      }

      // Create order, close cart, clear credits (atomic)
      const result = await db.transaction(async (tx) => {
        const safeUserId = cart.sid; // fallback; if you store userId on cart, use it here

        const [order] = await tx
          .insert(orders)
          .values({
            id: undefined,
            userId: safeUserId,
            cartId: cart.id,
            status: "placed",
            paymentStatus: "paid",
            provider: "stripe",
            providerId: pi.id,

            currency: ordersCurrency,
            subtotalCents,
            shippingCents: shipCents,
            taxCents,
            discountCents: creditsCents, // roll-up discount
            creditsCents,                // loyalty bucket
            totalCents,

            placedAt: new Date().toISOString(),
          } as any)
          .returning();

        await tx.update(carts).set({ status: "closed" }).where(eq(carts.id, cart.id));
        await tx.delete(cartCredits).where(eq(cartCredits.cartId, cart.id));

        return { orderId: order.id };
      });

      return NextResponse.json({ ok: true, orderId: result.orderId });
    }

    // Legacy/no-op for Checkout Sessions (you’re not using Checkout now)
    if (event.type === "checkout.session.completed") {
      // You can keep this for backward compatibility, or safely ignore:
      // const session = event.data.object as Stripe.Checkout.Session;
      // console.log("Checkout session completed (unused in Payment Element flow)", session.id);
    }
  } catch (e) {
    console.error("webhook handler failed:", e);
  }

  return NextResponse.json({ received: true });
}
