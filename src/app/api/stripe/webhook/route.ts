// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Make envs definitively strings
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

const stripe = new Stripe(STRIPE_KEY);

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 400 });
  }

  // Use raw text body for signature verification
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("Webhook signature verification failed.", err?.message);
    return NextResponse.json({ ok: false, error: "bad_signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const origin =
        process.env.PUBLIC_APP_ORIGIN ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        "http://localhost:3000";

      await fetch(`${origin}/api/orders/place`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal": "stripe-webhook",
        },
        body: JSON.stringify({
          sid: session.metadata?.sid ?? null,
          stripeSessionId: session.id,
          store: (session.metadata?.store as "US" | "CA") ?? "US",
          shipping: session.metadata?.shipping
            ? JSON.parse(session.metadata.shipping)
            : null,
        }),
      });
    }
  } catch (e) {
    console.error("webhook handler failed:", e);
  }

  return NextResponse.json({ received: true });
}
