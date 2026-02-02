import "server-only";
import { headers, cookies } from "next/headers";
import Link from "next/link";
import CheckoutPaymentElement from "@/components/CheckoutPaymentElement"; // client component

import { db } from "@/lib/db";
import { and, eq, ne } from "drizzle-orm";
import { carts } from "@/lib/db/schema/cart";
import { cartLines } from "@/lib/db/schema/cartLines";

// ✅ NEW: get applied loyalty credits (in cents) for this cart
import { getCartCreditsCents } from "@/lib/cartCredits";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* -------------------------- Helpers -------------------------- */

function originFromHeaders(h: Headers) {
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

function moneyFmt(amount: number, currency: "USD" | "CAD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

/* --------------------- Load cart summary --------------------- */
async function loadCartSummary() {
  const jar = await cookies();
  const sid = jar.get("sid")?.value ?? jar.get("adap_sid")?.value ?? "";
  if (!sid) return null;

  const [cartRow] =
    (await db
      .select({
        id: carts.id,
        status: carts.status,
        currency: carts.currency,
        selectedShipping: carts.selectedShipping, // { cost, method, days, carrier }
      })
      .from(carts)
      .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
      .limit(1)) ?? [];

  if (!cartRow) return null;

  const lineRows = await db
    .select({
      quantity: cartLines.quantity,
      unitPriceCents: cartLines.unitPriceCents,
      lineTotalCents: cartLines.lineTotalCents,
    })
    .from(cartLines)
    .where(eq(cartLines.cartId, cartRow.id));

  // Subtotal in dollars (prefer stored line total cents; otherwise qty * unit)
  const subtotalCents = lineRows.reduce((acc, r) => {
    const qty = Number(r.quantity ?? 0);
    const unit = Number(r.unitPriceCents ?? 0);
    const line = Number.isFinite(Number(r.lineTotalCents)) ? Number(r.lineTotalCents) : qty * unit;
    return acc + line;
  }, 0);
  const subtotal = subtotalCents / 100;

  const shipping = Number(cartRow.selectedShipping?.cost ?? 0);
  const tax = 0; // Insert your tax calc here when ready

  // ✅ Loyalty credits (in cents -> dollars)
  const creditsCents = await getCartCreditsCents(cartRow.id);
  const credits = Math.max(0, creditsCents / 100);

  // ✅ Final total never below zero
  const total = Math.max(0, subtotal + shipping + tax - credits);

  return {
    cartId: cartRow.id,
    currency: (cartRow.currency as "USD" | "CAD") ?? "USD",
    shippingMeta: cartRow.selectedShipping ?? null,
    subtotal,
    shipping,
    tax,
    creditsCents,
    credits,
    total,
  };
}

/* ---------------------------- Page --------------------------- */
export default async function CheckoutPage() {
  const h = await headers();
  const origin = originFromHeaders(h);

  // forward cookies so the API uses the same session/SID
  const jar = await cookies();
  const cookieHeader = jar.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  // 🔢 Load cart summary for UI (and to sanity-check)
  const summary = await loadCartSummary();

  // ask your API to create a PaymentIntent and return client_secret
  // IMPORTANT: your /api/create-payment-intent route should compute the chargeable amount
  // FROM THE SERVER using the same cart math (subtotal - credits + shipping + tax),
  // not from the client, to avoid tampering.
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
      // fall through
    }
  }

  const hasPk = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  // Graceful empty-cart UI
  if (!summary) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center px-4 py-10">
        <h1 className="mb-6 text-2xl font-semibold">Secure payment</h1>
        <div className="w-full max-w-lg rounded-xl border bg-white p-6 text-sm text-red-600">
          Your cart is empty. Please add items and try again.
        </div>
        <a
          href="/cart/review"
          className="mt-6 inline-flex rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
        >
          Back to cart
        </a>
      </main>
    );
  }

  const { subtotal, shipping, tax, creditsCents, credits, total, currency, shippingMeta } = summary;

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-5xl grid-cols-1 gap-8 px-4 py-10 md:grid-cols-[1.2fr_0.8fr]">
      <section className="min-w-0">
        <h1 className="mb-6 text-2xl font-semibold">Secure payment</h1>

        {!hasPk ? (
          <div className="w-full rounded-xl border bg-white p-6 text-sm text-red-600">
            Missing <code className="font-mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>. Set it in your environment and reload.
          </div>
        ) : !clientSecret ? (
          <div className="w-full rounded-xl border bg-white p-6 text-sm text-red-600">
            We couldn’t start checkout. Please review your cart and try again.
          </div>
        ) : (
          // ✅ Client component receives the server-fetched clientSecret
          <CheckoutPaymentElement clientSecret={clientSecret} />
        )}

        <a
          href="/cart/review"
          className="mt-6 inline-flex rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
        >
          Back to cart
        </a>
      </section>

      {/* Order summary (mirrors Review page, includes Loyalty credit) */}
      <aside className="h-max rounded-lg border bg-neutral-50 p-4">
        <h2 className="mb-3 text-lg font-semibold">Order summary</h2>

        <div className="flex justify-between py-2">
          <span>Subtotal</span>
          <span>{moneyFmt(subtotal, currency)}</span>
        </div>

        <div className="flex justify-between py-2">
          <span>
            Shipping
            {shippingMeta?.method ? ` — ${shippingMeta.method}` : " (estimated)"}
          </span>
        {/* cost already in dollars */}
          <span>{moneyFmt(shipping, currency)}</span>
        </div>

        <div className="flex justify-between py-2">
          <span>Tax</span>
          <span>{moneyFmt(tax, currency)}</span>
        </div>

        {/* ✅ Loyalty credit shown as negative amount */}
        {creditsCents > 0 && (
          <div className="flex items-center justify-between py-2 text-sm">
            <span className="text-gray-700">Loyalty credit</span>
            <span className="font-medium text-emerald-700">−{moneyFmt(credits, currency)}</span>
          </div>
        )}

        <hr className="my-2" />

        <div className="flex justify-between py-2 text-lg font-bold">
          <span>Total</span>
          <span>{moneyFmt(total, currency)}</span>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Your payment intent amount should match this total. Ensure your
          <code className="mx-1 rounded bg-white px-1 py-0.5">/api/create-payment-intent</code>
          uses server-side math: <em>subtotal + shipping + tax − loyalty credits</em>.
          (Keep your earning/redeeming rules aligned with the <strong>SinaLite API documentation</strong>.)
        </p>
      </aside>
    </main>
  );
}
