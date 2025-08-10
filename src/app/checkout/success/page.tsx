// app/checkout/success/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SuccessPage({
  searchParams,
}: { searchParams?: { session_id?: string } }) {
  const sessionId = searchParams?.session_id;
  // Optional: fetch the Stripe session + your order for display
  // const session = await stripe.checkout.sessions.retrieve(sessionId!) // (server side)
  // or call your internal /api to show latest order status

  return (
    <main className="container py-14 text-center">
      <h1 className="text-3xl font-bold mb-3">Payment received 🎉</h1>
      <p className="text-neutral-600 mb-6">
        We’re processing your order now. You’ll receive an email with details shortly.
      </p>
      <div className="flex justify-center gap-4">
        <Link className="btn btn-primary" href="/orders">View my orders</Link>
        <Link className="btn" href="/">Continue shopping</Link>
      </div>
    </main>
  );
}
