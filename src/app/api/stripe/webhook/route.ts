// src/app/api/stripe/webhook/route.ts
import "server-only";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { db } from "@/lib/db";
import { and, eq, ne } from "drizzle-orm";
import { carts } from "@/lib/db/schema/cart";
import { cartLines } from "@/lib/db/schema/cartLines";
import { cartCredits } from "@/lib/db/schema/cartCredits";
import { orders } from "@/lib/db/schema/orders";
import { getCartCreditsCents } from "@/lib/cartCredits";
import { calculateTaxCents } from "./tax";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ------------------------- Strict envs ------------------------- */
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

/* --------------------- Helpers: cart & totals ------------------- */
async function loadOpenCartByRef(ref: { cartId?: string | null; sid?: string | null }) {
  const { cartId, sid } = ref;

  const { select } = db;

  if (cartId) {
    const [byId] =
      (await select({
        id: carts.id,
        status: carts.status,
        currency: carts.currency,
        selectedShipping: carts.selectedShipping,
        sid: carts.sid,
        userId: carts.userId,
      })
        .from(carts)
        .where(and(eq(carts.id, cartId), ne(carts.status, "closed")))
        .limit(1)) ?? [];
    if (byId) return byId;
  }

  if (sid) {
    const [bySid] =
      (await select({
        id: carts.id,
        status: carts.status,
        currency: carts.currency,
        selectedShipping: carts.selectedShipping,
        sid: carts.sid,
        userId: carts.userId,
      })
        .from(carts)
        .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
        .limit(1)) ?? [];
    if (bySid) return bySid;
  }

  return null;
}

async function computeCartTotalsCents(
  cartRow: {
    id: string;
    currency: "USD" | "CAD" | string | null;
    selectedShipping: { cost?: number | string | null } | null;
  },
  opts: { stripeTotalCents?: number | null } = {},
) {
  const { select } = db;

  const rows = await select({
    quantity: cartLines.quantity,
    unitPriceCents: cartLines.unitPriceCents,
    lineTotalCents: cartLines.lineTotalCents,
  })
    .from(cartLines)
    .where(eq(cartLines.cartId, cartRow.id));

  const subtotalCents = rows.reduce((sum: number, r: any) => {
    const qty = Number(r.quantity ?? 0);
    const unit = Number(r.unitPriceCents ?? 0);
    const line = Number.isFinite(Number(r.lineTotalCents))
      ? Number(r.lineTotalCents)
      : qty * unit;
    return sum + (Number.isFinite(line) ? line : 0);
  }, 0);

  const shipCents = Math.round(Number(cartRow?.selectedShipping?.cost ?? 0) * 100) || 0;
  const creditsCents = await getCartCreditsCents(cartRow.id);

  const { taxCents } = calculateTaxCents({
    subtotalCents,
    shippingCents: shipCents,
    creditsCents,
    location: (cartRow as any)?.selectedShipping ?? null,
    stripeTotalCents: opts.stripeTotalCents ?? null,
  });

  const totalCents = Math.max(0, subtotalCents + shipCents + taxCents - creditsCents);

  const ordersCurrency = String(cartRow.currency || "USD").toUpperCase() as "USD" | "CAD";
  const stripeCurrency = (ordersCurrency === "CAD" ? "cad" : "usd") as "usd" | "cad";

  return { subtotalCents, shipCents, taxCents, creditsCents, totalCents, ordersCurrency, stripeCurrency };
}

/* ----------------- Idempotent order finalizer ------------------- */
async function finalizePaidOrderFromCartRef(args: {
  piId?: string | null;
  sessionId?: string | null;
  sid?: string | null;
  cartId?: string | null;
  stripeTotalCents?: number | null;
}) {
  const { piId, cartId, sid } = args;

  const { select, transaction } = db;

  if (piId) {
    const existing = await select({ id: orders.id })
      .from(orders)
      .where(eq(orders.providerId, piId))
      .limit(1);
    if (existing.length > 0) return String(existing[0].id);
  }

  if (cartId) {
    const existingByCart = await select({ id: orders.id })
      .from(orders)
      .where(eq(orders.cartId, cartId))
      .limit(1);
    if (existingByCart.length > 0) return String(existingByCart[0].id);
  }

  const cart = await loadOpenCartByRef({ cartId: cartId ?? null, sid: sid ?? null });
  if (!cart) return null;

  const { subtotalCents, shipCents, taxCents, creditsCents, totalCents, ordersCurrency } =
    await computeCartTotalsCents(cart, { stripeTotalCents: args.stripeTotalCents ?? null });

  const result = await transaction(async (tx: any) => {
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

        const amountReceivedCents =
          typeof pi.amount_received === "number" && pi.amount_received > 0
            ? pi.amount_received
            : typeof pi.amount === "number"
              ? pi.amount
              : null;

        await finalizePaidOrderFromCartRef({
          piId: pi.id,
          sid,
          cartId,
          stripeTotalCents: amountReceivedCents,
        });

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

        const amountTotalCents =
          typeof (session as any)?.amount_total === "number"
            ? (session as any).amount_total
            : null;

        await finalizePaidOrderFromCartRef({
          piId: piId ?? null,
          sessionId: session.id,
          sid,
          cartId,
          stripeTotalCents: amountTotalCents,
        });

        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ ok: true, ignored: event.type });
    }
  } catch (e: any) {
    console.error("webhook handler failed:", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
