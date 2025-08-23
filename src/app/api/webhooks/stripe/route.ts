// src/app/api/webhooks/stripe/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { customers, loyaltyTransactions, loyaltyWallets, orders } from "@/db/schema/customer";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" }); // keep current

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature")!;
  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
    const obj = event.data.object as any;
    const providerId = obj.id || obj.payment_intent || obj.client_secret;

    // Find order by provider_id
    const [order] = await db.select().from(orders).where(eq(orders.providerId, providerId)).limit(1);
    if (order && order.status !== 'paid') {
      // Mark paid (you may already do this elsewhere)
      await db.update(orders).set({ status: 'paid', placedAt: order.placedAt ?? new Date() }).where(eq(orders.id, order.id));

      // Find wallet
      const [wallet] = await db.select().from(loyaltyWallets).where(eq(loyaltyWallets.customerId, order.customerId)).limit(1);
      const earn = Math.max(0, Math.round(order.totalCents / 100)); // 1pt per $1

      if (earn > 0 && wallet) {
        await db.transaction(async (tx) => {
          await tx.insert(loyaltyTransactions).values({
            walletId: wallet.id, delta: earn, reason: 'purchase', orderId: order.id, note: 'Points for paid order',
          });
          await tx.update(loyaltyWallets).set({
            pointsBalance: wallet.pointsBalance + earn,
            updatedAt: new Date(),
          }).where(eq(loyaltyWallets.id, wallet.id));
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
