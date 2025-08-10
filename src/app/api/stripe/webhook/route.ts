// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { enforceRateLimit } from "@/lib/rateLimit";
import { markOrderPaid, saveSinaliteOrderId, getOrderSessionByStripeSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function placeSinaliteOrder(orderSessionId: string, payload: any) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/order/place`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, orderSessionId }),
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Sinalite place failed: ${res.status} ${txt}`);
  }
  return res.json() as Promise<{ orderId: number; status: string; message?: string }>;
}

export async function POST(req: NextRequest) {
  // (Optional) keep a very light rate limit
  const limited = await enforceRateLimit(req);
  if (limited) {
    return limited;
  }

  const sig = req.headers.get("stripe-signature");
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !whSecret) {
    return NextResponse.json({ error: "Missing Stripe signature/secret" }, { status: 400 });
  }

  // Get the **raw** request body (do NOT JSON.parse)
  const rawBody = await req.text(); // stripe accepts string or Buffer

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whSecret);
  } catch (err: any) {
    console.error("[stripe.webhook] signature verify failed:", err?.message || err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const stripeSessionId = session.id;
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

        const orderSessionId = session.metadata?.orderSessionId ?? undefined;

        // Mark paid in our DB
        if (orderSessionId && paymentIntentId) {
          await markOrderPaid(orderSessionId, paymentIntentId);
        }

        // Place Sinalite order
        if (orderSessionId) {
          const order = await getOrderSessionByStripeSession(
            stripeSessionId,
            paymentIntentId ?? undefined
          );

          if (order && order.shippingInfo && order.billingInfo) {
            const payload = {
              items: [
                {
                  productId: order.productId,
                  options: order.options ?? [],
                  files: order.files ?? [],
                },
              ],
              shippingInfo: order.shippingInfo,
              billingInfo: order.billingInfo,
              notes: order.notes ?? undefined,
            };

            const placed = await placeSinaliteOrder(orderSessionId, payload);
            if (placed?.orderId) {
              await saveSinaliteOrderId(orderSessionId, placed.orderId);
            }
          }
        }
        break;
      }

      // Handle other events as needed
      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("[stripe.webhook] handler error:", err?.message || err);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }
}
