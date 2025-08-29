// src/app/api/webhooks/stripe/route.ts
import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import type Stripe from "stripe";
import { db } from "@/lib/db";

// If your `orders` table is exported from a different module, adjust this import:
import { orders } from "@/db/schema/customer"; // ← has `orders`
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const providerId = session.id; // stable id for CS
    const amountTotal = session.amount_total ?? 0; // cents
    const currency = (session.currency || "usd").toUpperCase() as "USD" | "CAD";

    const meta = session.metadata ?? {};
    const sid = (meta.sid as string) || "";
    const cartId = (meta.cartId as string) || "";
    const shipping = meta.shipping ? JSON.parse(String(meta.shipping)) : null;

    // 1) Find existing order by providerId
    const existing = await db.select().from(orders)
      .where(eq(orders.providerId, providerId))
      .limit(1);

    if (existing.length === 0) {
      // 2) Create the order (status: paid)
      await db.insert(orders).values({
        providerId,                 // text unique
        sid,                        // associate by session if you use guest checkout
        cartId,                     // optional column in your schema
        status: "paid",             // or "completed" per your statuses
        currency,                   // "USD" | "CAD"
        totalCents: amountTotal,    // integer cents
        placedAt: new Date(),
        shipping: shipping,         // jsonb, matches your carts.selectedShipping shape
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any); // cast if your schema has extra cols
    } else if (existing[0].status !== "paid") {
      // 3) Idempotent update to paid
      await db.update(orders)
        .set({ status: "paid", totalCents: amountTotal, updatedAt: new Date(), placedAt: existing[0].placedAt ?? new Date() })
        .where(eq(orders.id, existing[0].id));
    }

    // (Optional) If you have an order_items table, copy cart lines here.
  }

  // You can also handle `payment_intent.succeeded` similarly if needed.
  return NextResponse.json({ received: true });
}
