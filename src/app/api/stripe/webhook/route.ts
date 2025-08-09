import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { placeSinaliteOrder } from "@/lib/sinalite.order";
import { getOrderSessionById, markOrderPaid, saveSinaliteOrderId } from "@/lib/session";
import { sendEmail } from "@/lib/sendEmail";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, secret);
  } catch (err: any) {
    console.error("Webhook signature verification failed.", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const orderSessionId = session.metadata?.orderSessionId;
    try {
      const orderSession = await getOrderSessionById(orderSessionId);
      if (!orderSession) throw new Error("Order session not found in webhook.");

      // Build the Sinalite /order/new payload **exactly** per their docs
      const orderData = {
        items: [
          {
            productId: orderSession.productId,
            options: orderSession.options, // array of option ids (or roll-label object if product type requires)
            files: (orderSession.files || []).map((f: any) => ({
              type: f.type || "front",
              url: f.url,
            })),
            extra: orderSession.extra || undefined,
          },
        ],
        shippingInfo: {
          ShipFName: orderSession.shippingInfo.ShipFName,
          ShipLName: orderSession.shippingInfo.ShipLName,
          ShipEmail: orderSession.shippingInfo.ShipEmail,
          ShipAddr: orderSession.shippingInfo.ShipAddr,
          ShipAddr2: orderSession.shippingInfo.ShipAddr2 || "",
          ShipCity: orderSession.shippingInfo.ShipCity,
          ShipState: orderSession.shippingInfo.ShipState,
          ShipZip: orderSession.shippingInfo.ShipZip,
          ShipCountry: orderSession.shippingInfo.ShipCountry,
          ShipPhone: orderSession.shippingInfo.ShipPhone,
          ShipMethod: orderSession.selectedShippingRate
            ? orderSession.selectedShippingRate[1] // service string, e.g., "UPS Standard"
            : undefined,
        },
        billingInfo: {
          BillFName: orderSession.billingInfo.BillFName,
          BillLName: orderSession.billingInfo.BillLName,
          BillEmail: orderSession.billingInfo.BillEmail,
          BillAddr: orderSession.billingInfo.BillAddr,
          BillAddr2: orderSession.billingInfo.BillAddr2 || "",
          BillCity: orderSession.billingInfo.BillCity,
          BillState: orderSession.billingInfo.BillState,
          BillZip: orderSession.billingInfo.BillZip,
          BillCountry: orderSession.billingInfo.BillCountry,
          BillPhone: orderSession.billingInfo.BillPhone,
        },
        notes: orderSession.notes || undefined,
      };

      // Place the order with Sinalite
      const placed = await placeSinaliteOrder(orderData); // { orderId, message, status }
      await saveSinaliteOrderId(orderSessionId, placed.orderId);
      await markOrderPaid(orderSessionId, session.payment_intent || session.id);

      // Send order confirmation email
      await sendEmail({
        to: orderSession.customerEmail,
        subject: `Order Confirmation #${placed.orderId}`,
        react: OrderConfirmationEmail({
          name: `${orderSession.shippingInfo.ShipFName} ${orderSession.shippingInfo.ShipLName}`,
          orderId: placed.orderId,
          orderTotal: (orderSession.total || 0).toLocaleString("en-US", { style: "currency", currency: orderSession.currency || "USD" }),
          trackingUrl: undefined, // you’ll add when Sinalite provides tracking later
        }),
      });

    } catch (err: any) {
      console.error("checkout.session.completed handler failed:", err);
      // Consider alerting/observability here
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

// Edge runtimes need special handling for raw body; keep as Node for now:
export const config = { api: { bodyParser: false } } as any;
