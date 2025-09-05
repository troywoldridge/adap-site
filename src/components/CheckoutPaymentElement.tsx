// src/components/CheckoutPaymentElement.tsx
"use client";

import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe-public";

type Props = { clientSecret: string };

function InnerForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout/complete` },
    });

    if (error) setMessage(error.message || "Something went wrong.");
    setLoading(false);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-lg rounded-xl border bg-white p-6 shadow-sm"
    >
      <div className="mb-4">
        <PaymentElement options={{ layout: "accordion" }} />
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Processing…" : "Pay now"}
      </button>

      {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
    </form>
  );
}

export default function CheckoutPaymentElement({ clientSecret }: Props) {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="w-full max-w-lg rounded-xl border bg-white p-6 text-sm text-red-600">
        Missing <code className="font-mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>.
      </div>
    );
  }

  if (!clientSecret) {
    return <div className="text-sm text-gray-600">Preparing secure payment…</div>;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: "stripe" } }}
    >
      <InnerForm />
    </Elements>
  );
}
