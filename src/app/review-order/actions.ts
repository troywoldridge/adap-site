"use server";

import { stripe } from "@/lib/stripe";
import { redirect } from "next/navigation";
import { getOrderSessionById } from "@/lib/session"; // you already have this per your flow

export async function createCheckoutSession(formData: FormData) {
  const orderSessionId = formData.get("orderSessionId") as string;
  if (!orderSessionId) {
    throw new Error("Missing orderSessionId");
  }

  const session = await getOrderSessionById(orderSessionId);
  if (!session) {
    throw new Error("Order session not found");
  }

  // Build line items based on your session
  // Assumes session has productName, quantity, unitPrice, currency, and selectedShippingRate (array from Sinalite)
  // selectedShippingRate shape per your docs: [carrier, service, price, availableFlag] //TODO fix this
  
  const currency = session.currency || "USD";
  const productName = session.productName || "Custom Print Product";
  const qty = Number(session.quantity || 1);
  const unit = Math.round(Number(session.unitPrice) * 100); // cents
  const subtotal = unit * qty;

  const shippingCostCents = session.selectedShippingRate
    ? Math.round(Number(session.selectedShippingRate[2]) * 100)
    : 0;

  const taxCents = Math.round(Number(session.tax || 0) * 100);
  const discountCents = Math.round(Number(session.discount || 0) * 100);
  const totalCents = Math.max(subtotal + shippingCostCents + taxCents - discountCents, 0);

  const stripeSession = await stripe.checkout.sessions.create({
    mode: "payment",
    currency,
    customer_email: session.customerEmail || undefined,
    line_items: [
      {
        quantity: qty,
        price_data: {
          currency,
          product_data: {
            name: productName,
            description: session.productDescription || undefined,
          },
          unit_amount: unit,
        },
      },
    ],
    // Shipping as a separate line item (explicit) – keeps accounting crystal clear
    ...(shippingCostCents > 0
      ? {
          shipping_options: [
            {
              shipping_rate_data: {
                display_name: `${session.selectedShippingRate[0]} — ${session.selectedShippingRate[1]}`,
                type: "fixed_amount",
                fixed_amount: { amount: shippingCostCents, currency },
              },
            },
          ],
        }
      : {}),
    // If you prefer taxes in Stripe, use automatic_tax. If you already compute tax in backend, add a line item instead.
    // automatic_tax: { enabled: true },

    // Metadata lets the webhook know which cart/order session to finalize with Sinalite
    metadata: {
      orderSessionId,
    },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/review-order?canceled=1`,
  });

  redirect(stripeSession.url!);
}
