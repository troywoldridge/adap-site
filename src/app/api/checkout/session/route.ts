// src/app/api/checkout/session/route.ts
import "server-only";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// IMPORTANT:
// Do NOT read/validate STRIPE_SECRET_KEY at module top-level.
// Next.js can import this file during "Collecting page data" in build.
// Cloudflare build environment often does not have runtime secrets present.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getStripeSecret(): string | null {
  const v =
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_API_KEY ||
    process.env.STRIPE_SECRET ||
    "";
  const s = String(v).trim();
  return s ? s : null;
}

function stripeClient(): Stripe {
  const secret = getStripeSecret();
  if (!secret) {
    // Throw ONLY when the route is actually invoked at runtime.
    // This prevents Next build from failing during module import.
    throw new Error("Missing STRIPE_SECRET_KEY (or STRIPE_API_KEY).");
  }

  return new Stripe(secret, {
    apiVersion: "2025-07-30.basil",
    // If you're using Cloudflare Workers runtime instead, you'd pass fetch here.
    // But you have runtime="nodejs", so leave it alone.
  });
}

// If your app uses POST to create the session, keep POST.
// If you use GET, duplicate the logic or switch to POST only.
export async function POST(req: NextRequest) {
  try {
    const stripe = stripeClient();

    const body = (await req.json().catch(() => ({}))) as any;

    // TODO: keep your existing payload mapping here.
    // I'm providing a safe skeleton that won't crash build-time.
    // Replace items/amount logic with YOUR current logic.
    const {
      successUrl,
      cancelUrl,
      lineItems,
      customerEmail,
      metadata,
    } = body ?? {};

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: "lineItems must be a non-empty array" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: typeof successUrl === "string" ? successUrl : `${req.nextUrl.origin}/checkout/success`,
      cancel_url: typeof cancelUrl === "string" ? cancelUrl : `${req.nextUrl.origin}/cart`,
      customer_email: typeof customerEmail === "string" ? customerEmail : undefined,
      metadata: typeof metadata === "object" && metadata ? metadata : undefined,
    });

    return NextResponse.json({ id: session.id, url: session.url });
  } catch (err: any) {
    const msg = String(err?.message ?? err ?? "Unknown error");
    const missing = msg.toLowerCase().includes("missing stripe_secret_key");
    return NextResponse.json(
      { error: msg },
      { status: missing ? 500 : 500 }
    );
  }
}

// If you also support GET in your app, you can either remove it,
// or keep it returning 405 to enforce POST:
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
