// src/app/api/stripe/webhook/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe"; // your configured Stripe client (stable version)
import { finalizePaidOrderFromCartRef } from "@/lib/orderFinalize"; // ✅ single source of truth
// DB imports no longer needed here because the finalizer handles persistence

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ------------------------- Strict envs ------------------------- */
const STRIPE_WEBHOOK_SECRET: string =
  process.env.STRIPE_WEBHOOK_SECRET ??
  (() => {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  })();

/* ------------------------- Webhook handler ---------------------- */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 400 });
  }

  // Important: use raw body string for signature verification
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

        await finalizePaidOrderFromCartRef({
          piId: pi.id,
          sid,
          cartId,
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

        await finalizePaidOrderFromCartRef({
          piId: piId ?? null,
          sessionId: session.id,
          sid,
          cartId,
        });

        return NextResponse.json({ ok: true });
      }

      // You can whitelist more events as needed, but ignore the rest safely
      default: {
        // 200 OK so Stripe doesn’t retry for unsupported events
        return NextResponse.json({ ok: true, ignored: event.type });
      }
    }
  } catch (e: any) {
    console.error("Stripe webhook handler failed:", e);
    // Return 200 so Stripe retries per its schedule (avoids retry storms on transient errors)
    return NextResponse.json({ ok: false, error: String(e?.message || e) });
  }
}
