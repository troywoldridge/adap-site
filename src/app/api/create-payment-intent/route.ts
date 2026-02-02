// src/app/api/create-payment-intent/route.ts
import "server-only";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";
import { and, eq, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { carts } from "@/lib/db/schema/cart";
import { cartLines } from "@/lib/db/schema/cartLines";
import { cartCredits } from "@/lib/db/schema/cartCredits";
import { getCartCreditsCents } from "@/lib/cartCredits";
import { calculateTaxCents } from "@/app/api/stripe/webhook/tax";
import { finalizeFreeOrderBySid } from "@/lib/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const STRIPE_KEY: string =
  process.env.STRIPE_SECRET_KEY ??
  (() => {
    throw new Error("Missing STRIPE_SECRET_KEY");
  })();

const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2025-07-30.basil" });

function toInt(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function shipCentsFromSelectedShipping(selectedShipping: unknown): number {
  const s = selectedShipping as any;
  const cost = s?.cost ?? s?.rate?.cost ?? s?.price ?? 0;
  const dollars = Number(cost);
  if (!Number.isFinite(dollars) || dollars <= 0) return 0;
  return Math.round(dollars * 100);
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    // Identify session (guest SID) from cookies or header.
    // This route likely already has your SID logic elsewhere; keep it simple here.
    const sid =
      req.cookies.get("adap_sid")?.value ??
      req.cookies.get("sid")?.value ??
      req.headers.get("x-sid") ??
      "";

    if (!sid) {
      return NextResponse.json({ ok: false, error: "missing_sid" }, { status: 400 });
    }

    // Load open cart
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

    if (!cart) {
      return NextResponse.json({ ok: false, error: "no_open_cart" }, { status: 404 });
    }

    // Load lines for subtotal
    const lineRows = await db
      .select({
        quantity: cartLines.quantity,
        unitPriceCents: cartLines.unitPriceCents,
        lineTotalCents: cartLines.lineTotalCents,
      })
      .from(cartLines)
      .where(eq(cartLines.cartId, cart.id));

    const subtotalCents = lineRows.reduce((sum: number, r) => {
      const qty = toInt(r.quantity, 0);
      const unit = toInt(r.unitPriceCents, 0);
      const line = Number.isFinite(Number(r.lineTotalCents))
        ? toInt(r.lineTotalCents, qty * unit)
        : qty * unit;
      return sum + (Number.isFinite(line) ? line : 0);
    }, 0);

    const shippingCents = shipCentsFromSelectedShipping(cart.selectedShipping);
    const creditsCents = await getCartCreditsCents(cart.id);

    const { taxCents } = calculateTaxCents({
      subtotalCents,
      shippingCents,
      creditsCents,
      location: (cart as any)?.selectedShipping ?? null,
      stripeTotalCents: null,
    });

    const totalCents = Math.max(0, subtotalCents + shippingCents + taxCents - creditsCents);

    // ✅ Free order path (credits cover total)
    if (totalCents === 0) {
      const orderId = await finalizeFreeOrderBySid({
        sid,
        expectedTotalCents: 0,
        userId: userId ?? null,
      });

      if (!orderId) {
        return NextResponse.json({ ok: false, error: "free_finalize_failed" }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        mode: "free",
        orderId,
        totalCents,
        currency: String(cart.currency || "USD").toUpperCase(),
      });
    }

    // Stripe PaymentIntent path
    const currency = (String(cart.currency || "USD").toUpperCase() === "CAD" ? "cad" : "usd") as "usd" | "cad";

    const intent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        sid,
        cartId: String(cart.id),
      },
    });

    return NextResponse.json({
      ok: true,
      mode: "stripe",
      clientSecret: intent.client_secret,
      amount: totalCents,
      currency,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[create-payment-intent] error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
