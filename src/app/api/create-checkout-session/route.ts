// app/api/create-checkout-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe"; // import type only
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderSessions } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";

  try {
    const allowDevNoAuth = !isProd && process.env.ALLOW_DEV_NO_AUTH === "1";
    const user = allowDevNoAuth ? { userId: "dev-user" } : await requireUser();

    const body = await req.json().catch(() => ({}));
    const { orderSessionId, test: testFromBody } = body as {
      orderSessionId?: string;
      test?: boolean;
    };

    if (!orderSessionId) {
      return NextResponse.json({ error: "orderSessionId required" }, { status: 400 });
    }

    const testFromQuery = req.nextUrl.searchParams.get("test") === "1";
    const keyLooksTest = (process.env.STRIPE_SECRET_KEY || "").startsWith("sk_test_");
    const TEST_MODE = Boolean(testFromBody || testFromQuery || keyLooksTest);

    // 1) Load order session
    const session = await db.query.orderSessions.findFirst({
      where: (os, { eq }) => eq(os.id, orderSessionId),
    });

    if (!session) {
      return NextResponse.json({ error: "Order session not found" }, { status: 404 });
    }
    if (!allowDevNoAuth && session.userId && session.userId !== user.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const toCents = (n: number | string | null | undefined) => Math.round(Number(n || 0) * 100);
    const currencyCode = String(session.currency || "USD").toLowerCase();
    const totalCents = toCents(session.total);

    const description = Array.isArray(session.options)
      ? `Options: ${session.options.join(", ")}`
      : `Options: ${JSON.stringify(session.options)}`;

    // ✅ Use the *create params* type for line items
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        quantity: 1,
        price_data: {
          currency: currencyCode,
          product_data: {
            name: session.productId ?? "Custom Print Order",
            description: description.slice(0, 499),
          },
          unit_amount: totalCents,
        },
      },
    ];

    // Test override: $20 item
    if (TEST_MODE) {
      lineItems = [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: {
              name: "Test Order — $20.00",
              description: "Demo checkout (automatic tax on).",
            },
            unit_amount: 2000,
          },
        },
      ];
    }

    const base =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      automatic_tax: { enabled: true },
      shipping_address_collection: { allowed_countries: ["US", "CA"] },
      phone_number_collection: { enabled: true },
      customer_email:
        (session.billingInfo as any)?.BillEmail ||
        (session.shippingInfo as any)?.ShipEmail ||
        undefined,
      line_items: lineItems, // ← now correctly typed
      success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/review-order`,
      metadata: {
        orderSessionId: session.id,
        productId: String(session.productId ?? ""),
        testMode: TEST_MODE ? "1" : "0",
      },
    });

    await db
      .update(orderSessions)
      .set({ stripeCheckoutSessionId: checkoutSession.id })
      .where(eq(orderSessions.id, orderSessionId));

    return NextResponse.json({ url: checkoutSession.url }, { status: 200 });
  } catch (err: any) {
    console.error("[create-checkout-session] error:", err);
    const message =
      process.env.NODE_ENV === "production"
        ? "Failed to create checkout session"
        : err?.message || String(err);
    const status =
      err?.statusCode && Number(err.statusCode) >= 400 ? Number(err.statusCode) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
