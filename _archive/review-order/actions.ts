"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { stripe } from "@/lib/stripe"; // singleton Stripe client (apiVersion 2024-06-20)
import { getOrderSession } from "@/lib/session";

const CreateSessionSchema = z.object({
  orderSessionId: z.string().uuid(),
});

export async function createCheckoutSession(formData: FormData) {
  // 1) Validate payload
  const parsed = CreateSessionSchema.safeParse({
    orderSessionId: formData.get("orderSessionId"),
  });
  if (!parsed.success) {
    throw new Error("Invalid form payload");
  }

  // 2) Load current order session (server-side)
  const order = await getOrderSession();
  if (!order || order.id !== parsed.data.orderSessionId) {
    throw new Error("Order session not found");
  }

  // 3) Build line items (single summarized item that matches the computed total)
  const toCents = (n: number | string | null | undefined) =>
    Math.round(Number(n || 0) * 100);

  const currencyCode = (order.currency || "USD").toLowerCase();

  const description =
    Array.isArray(order.options)
      ? `Options: ${order.options.join(", ")}`
      : `Options: ${JSON.stringify(order.options)}`;

  const lineItems: Array<{
    quantity: number;
    price_data: {
      currency: string;
      product_data: { name: string; description?: string };
      unit_amount: number;
    };
  }> = [
    {
      quantity: 1,
      price_data: {
        currency: currencyCode,
        product_data: {
          name: String(order.productId),
          description: description.slice(0, 499),
        },
        unit_amount: toCents(order.total), // your computed total (subtotal + shipping + tax - discount)
      },
    },
  ];

  // 4) Create Checkout Session with Automatic Tax
  // NOTE: You must also enable Automatic Tax in Stripe Dashboard (Settings → Tax → Automatic tax).
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,

    // ✅ Automatic tax ON
    automatic_tax: { enabled: true },

    // Collect shipping address so Stripe Tax can calculate properly
    shipping_address_collection: {
      allowed_countries: ["US", "CA"], // adjust as needed
    },

    // Optional: collect a phone number for shipping label/communication
    phone_number_collection: { enabled: true },

    // Pre-fill customer email when available
    customer_email:
      (order.billingInfo as any)?.BillEmail ||
      (order.shippingInfo as any)?.ShipEmail ||
      undefined,

    // Strong success/cancel URLs
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/review-order?canceled=1`,

    // Carry context through webhooks for fulfillment + Sinalite order placement
    metadata: {
      orderSessionId: order.id,
      productId: String(order.productId),
    },
  });

  if (!session.url) {
    throw new Error("Failed to create Stripe Checkout Session");
  }

  // 5) Off you go to Stripe Checkout
  redirect(session.url);
}
