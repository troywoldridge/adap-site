// src/app/orders/order/confirmation/page.tsx
import "server-only";
import type { Metadata } from "next";
import { stripe } from "@/lib/stripe";
import { getOrderSessionByStripeSession } from "@/lib/orders"; // whatever your actual path is

export const dynamic = "force-dynamic";

type OrderConfirmationPageProps = {
  searchParams: {
    session_id?: string;
  };
};

export const metadata: Metadata = {
  title: "Order confirmation",
  // ❗ if you had themeColor here, move it later into a `viewport` export per Next warning
};

export default async function OrderConfirmationPage({
  searchParams,
}: OrderConfirmationPageProps) {
  const sessionId = searchParams.session_id;
  let recap: any = null;

  if (sessionId) {
    try {
      const checkout = await stripe.checkout.sessions.retrieve(sessionId);
      recap = await getOrderSessionByStripeSession(
        sessionId,
        checkout.payment_intent as string,
      );
    } catch (e) {
      // swallow and show generic success
    }
  }

  // ⬇️ whatever JSX you already had
  return (
    <main className="mx-auto max-w-3xl py-12">
      <h1 className="text-2xl font-semibold mb-4">Order confirmation</h1>
      {/* Use `recap` / `sessionId` however you already do */}
      {/* Example placeholder: */}
      <p className="text-sm text-gray-500">
        {sessionId
          ? `We found your order for session ${sessionId}.`
          : "Thanks for your order!"}
      </p>
    </main>
  );
}
