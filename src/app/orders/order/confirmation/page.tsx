import { stripe } from "@/lib/stripe";
import { getOrderSessionByStripeSession } from "@/lib/session"; // implement to look up by session_id or PI id
import Link from "next/link";

export default async function OrderConfirmationPage({ searchParams }: { searchParams: { session_id?: string } }) {
  const sessionId = searchParams.session_id;
  let recap: any = null;

  if (sessionId) {
    try {
      const checkout = await stripe.checkout.sessions.retrieve(sessionId);
      recap = await getOrderSessionByStripeSession(sessionId, checkout.payment_intent as string);
    } catch (e) {
      // swallow and show generic success
    }
  }

  return (
    <main className="container py-16">
      <h1 className="text-3xl font-bold mb-4">Thank you! 🎉</h1>
      <p className="text-lg text-neutral-700">Your payment was received and your order is being processed.</p>

      {recap?.sinaliteOrderId ? (
        <p className="mt-4">
          <strong>Order #:</strong> {recap.sinaliteOrderId}
        </p>
      ) : (
        <p className="mt-4 text-neutral-600">We’re finalizing your order now. You’ll receive an email shortly.</p>
      )}

      <div className="mt-8">
        <Link href="/" className="btn btn-primary">Continue Shopping</Link>
      </div>
    </main>
  );
}
