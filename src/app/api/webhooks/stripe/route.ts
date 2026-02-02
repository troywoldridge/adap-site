import "server-only";

import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema/customer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const database = db;
    const session = event.data.object as Stripe.Checkout.Session;

    const providerId = session.id;
    const amountTotal = session.amount_total ?? 0;
    const currency = (session.currency || "usd").toUpperCase() as "USD" | "CAD";

    const meta = session.metadata ?? {};
    const sid = (meta.sid as string) || "";
    const cartId = (meta.cartId as string) || "";
    const shipping = meta.shipping ? JSON.parse(String(meta.shipping)) : null;

    const [existing] = await database
      .select()
      .from(orders)
      .where(eq(orders.providerId, providerId))
      .limit(1);

    if (!existing) {
      await database.insert(orders).values({
        providerId,
        sid,
        cartId,
        status: "paid",
        currency,
        totalCents: amountTotal,
        placedAt: new Date(),
        shipping,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    } else if (existing.status !== "paid") {
      await database
        .update(orders)
        .set({
          status: "paid",
          totalCents: amountTotal,
          updatedAt: new Date(),
          placedAt: existing.placedAt ?? new Date(),
        })
        .where(eq(orders.id, existing.id));
    }
  }

  return NextResponse.json({ received: true });
}
