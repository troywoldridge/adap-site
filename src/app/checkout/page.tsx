// src/app/checkout/page.tsx
import "server-only";
import { headers, cookies } from "next/headers";
import CheckoutPaymentElement from "@/components/CheckoutPaymentElement"; // ← client component

export const dynamic = "force-dynamic";
export const revalidate = 0;

function originFromHeaders(h: Headers) {
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function CheckoutPage() {
  const h = await headers();
  const origin = originFromHeaders(h);

  // forward cookies so the API uses the same session/SID
  const jar = await cookies();
  const cookieHeader = jar.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  // ask your API to create a PaymentIntent and return client_secret
  const res = await fetch(`${origin}/api/create-payment-intent`, {
    method: "POST",
    headers: { cookie: cookieHeader, accept: "application/json" },
    cache: "no-store",
  });

  let clientSecret = "";
  if (res.ok) {
    try {
      const data = await res.json();
      clientSecret = data?.clientSecret || "";
    } catch {
      // fall through to error UI below
    }
  }

  const hasPk = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-5xl flex-col items-center px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Secure payment</h1>

      {!hasPk ? (
        <div className="w-full max-w-lg rounded-xl border bg-white p-6 text-sm text-red-600">
          Missing <code className="font-mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>. Set it in your environment and reload.
        </div>
      ) : !clientSecret ? (
        <div className="w-full max-w-lg rounded-xl border bg-white p-6 text-sm text-red-600">
          We couldn’t start checkout. Please review your cart and try again.
        </div>
      ) : (
        // ✅ Render the client component directly with the server-fetched clientSecret
        <CheckoutPaymentElement clientSecret={clientSecret} />
      )}

      <a
        href="/cart/review"
        className="mt-6 inline-flex rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
      >
        Back to cart
      </a>
    </main>
  );
}

