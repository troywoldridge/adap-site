"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { STRIPE_PK } from "@/lib/stripe-public";

export default function CheckoutComplete() {
  const [status, setStatus] = useState("Checking payment…");

  useEffect(() => {
    const run = async () => {
      if (!STRIPE_PK) return setStatus("Stripe not configured.");
      const stripe = await loadStripe(STRIPE_PK);
      const clientSecret = new URLSearchParams(window.location.search).get(
        "payment_intent_client_secret"
      );
      if (!stripe || !clientSecret) return setStatus("Missing payment details.");

      const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
      switch (paymentIntent?.status) {
        case "succeeded":
          setStatus("Payment succeeded!");
          break;
        case "processing":
          setStatus("Your payment is processing.");
          break;
        case "requires_payment_method":
          setStatus("Payment failed. Try again.");
          break;
        default:
          setStatus("Something went wrong.");
      }
    };
    run();
  }, []);

  return (
    <main className="mx-auto flex min-height-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-10">
      <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-semibold">Checkout status</h1>
        <p className="text-gray-700">{status}</p>
        <a
          href="/cart/review"
          className="mt-6 inline-flex rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          Back to cart
        </a>
      </div>
    </main>
  );
}
