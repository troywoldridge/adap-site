// app/api/dev/seed-order-session/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { orderSessions } from "@/db/schema"; // or "@/db/schema/orderSessions" if that’s where it lives
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function deny(msg = "Not allowed") {
  return NextResponse.json({ error: msg }, { status: 403 });
}

type SeedBody = {
  id?: string;
  userId?: string;
  productId?: string;
  currency?: string; // "USD"|"CAD"|...
  total?: number; // dollars
  options?: (number | string)[] | Record<string, unknown>;
  files?: { type: string; url: string }[];
  shippingInfo?: Record<string, unknown> | null;
  billingInfo?: Record<string, unknown> | null;
  notes?: string | null;
  createCheckout?: boolean;
  test?: boolean;
};

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return deny("Seeding disabled in production");
  }

  const provided = req.headers.get("x-seed-secret") || "";
  const expected = process.env.DEV_SEED_SECRET || "";
  if (!expected || provided !== expected) {
    return deny("Missing or invalid x-seed-secret");
  }

  try {
    const body = (await req.json().catch(() => ({}))) as SeedBody;

    const id = body.id || randomUUID();
    const now = new Date();
    const totalNumber = typeof body.total === "number" ? body.total : 20.0;

    // shape kept loose to fit your existing schema
    const row = {
      id,
      userId: body.userId || "dev-user",
      productId: body.productId || "businesscard_14pt_aq",
      options: body.options ?? [],
      files: body.files ?? [],
      shippingInfo: body.shippingInfo ?? null,
      billingInfo: body.billingInfo ?? ({ BillEmail: "test@example.com" } as any),
      currency: body.currency || "USD",
      subtotal: "0",
      tax: "0",
      discount: "0",
      total: String(totalNumber),
      selectedShippingRate: null,
      stripeCheckoutSessionId: null,
      stripePaymentIntentId: null,
      sinaliteOrderId: null,
      trackingUrl: null,
      notes: body.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // ✅ No implicit-any: use eq(orderSessions.id, id)
    const existing =
      (await db
        .select()
        .from(orderSessions)
        .where(eq(orderSessions.id, id))
        .limit(1))?.[0] || null;

    if (!existing) {
      await db.insert(orderSessions).values(row);
    }

    const createCheckout =
      body.createCheckout === true ||
      req.nextUrl.searchParams.get("createCheckout") === "1";

    if (createCheckout) {
      const test =
        body.test === true ||
        req.nextUrl.searchParams.get("test") === "1" ||
        (process.env.STRIPE_SECRET_KEY || "").startsWith("sk_test_");

      const toCents = (n: number | string | null | undefined) =>
        Math.round(Number(n || 0) * 100);

      let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
        {
          quantity: 1,
          price_data: {
            currency: (row.currency || "USD").toLowerCase() as "usd" | "cad",
            product_data: {
              name: String(row.productId),
              description: Array.isArray(row.options)
                ? `Options: ${row.options.join(", ")}`.slice(0, 499)
                : `Options: ${JSON.stringify(row.options)}`.slice(0, 499),
            },
            unit_amount: toCents(totalNumber),
          },
        },
      ];

      if (test) {
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

      const base = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://adapnow.com").replace(/\/+$/, "");

      const checkout = await stripe.checkout.sessions.create({
        mode: "payment",
        automatic_tax: { enabled: true },
        shipping_address_collection: { allowed_countries: ["US", "CA"] },
        phone_number_collection: { enabled: true },
        customer_email:
          (row.billingInfo as any)?.BillEmail ||
          (row.shippingInfo as any)?.ShipEmail ||
          undefined,
        line_items: lineItems,
        success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/review-order`,
        metadata: {
          orderSessionId: row.id,
          productId: String(row.productId),
          testMode: test ? "1" : "0",
        },
      });

      await db
        .update(orderSessions)
        .set({ stripeCheckoutSessionId: checkout.id })
        .where(eq(orderSessions.id, row.id));

      return NextResponse.json(
        { id: row.id, checkoutUrl: checkout.url, test },
        { status: existing ? 200 : 201 }
      );
    }

    return NextResponse.json(
      { id: row.id, reused: Boolean(existing) },
      { status: existing ? 200 : 201 }
    );
  } catch (err: any) {
    console.error("[dev/seed-order-session] error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Failed to seed" },
      { status: 500 }
    );
  }
}
