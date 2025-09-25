// src/app/cart/review/page.tsx
import "server-only";
import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { and, eq, ne } from "drizzle-orm";
import { carts, cartLines } from "@/db/schema";
import productAssets from "@/data/productAssets.json";

// Client button (separate file)
import RemoveLineButton from "@/app/cart/review/RemoveLineButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Your Cart • Review",
  robots: { index: false, follow: false },
};

function moneyFmt(amountCents: number, currency: "USD" | "CAD") {
  const dollars = Math.max(0, Number(amountCents || 0)) / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(dollars);
  } catch {
    return `$${dollars.toFixed(2)}`;
  }
}

function buildProductNameMap() {
  const map = new Map<number, string>();
  try {
    const arr = productAssets as Array<{ id?: number; sinalite_id?: number; name?: string }>;
    for (const r of arr || []) {
      const pid = Number(r?.id ?? r?.sinalite_id);
      if (Number.isFinite(pid) && r?.name) map.set(pid, String(r.name));
    }
  } catch {}
  return map;
}

async function loadOpenCartByCookie() {
  const jar = await cookies();
  const sid = jar.get("sid")?.value ?? jar.get("adap_sid")?.value ?? null;
  if (!sid) return null;

  const [cartRow] =
    (await db
      .select({
        id: carts.id,
        sid: carts.sid,
        status: carts.status,
        currency: carts.currency,
        selectedShipping: carts.selectedShipping,
      })
      .from(carts)
      .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
      .limit(1)) ?? [];

  if (!cartRow) return null;

  const lines =
    (await db
      .select({
        id: cartLines.id,
        productId: cartLines.productId,
        quantity: cartLines.quantity,
        optionIds: cartLines.optionIds as any,
        unitPriceCents: cartLines.unitPriceCents,
        lineTotalCents: cartLines.lineTotalCents,
        currency: cartLines.currency,
      })
      .from(cartLines)
      .where(eq(cartLines.cartId, cartRow.id))) ?? [];

  return { cart: cartRow, lines };
}

export default async function CartReviewPage() {
  noStore();

  const result = await loadOpenCartByCookie();
  const nameMap = buildProductNameMap();

  if (!result || !result.lines || result.lines.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-14">
        <div className="mx-auto max-w-xl rounded-2xl border bg-white/70 p-10 shadow-sm backdrop-blur">
          <h1 className="text-center text-3xl font-semibold tracking-tight">Your cart</h1>
          <p className="mt-2 text-center text-neutral-600">Your cart is empty.</p>
          <a
            href="/"
            className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/60"
          >
            Continue shopping
          </a>
        </div>
      </main>
    );
  }

  const { cart, lines } = result;
  const currency = (cart.currency as "USD" | "CAD") ?? "USD";

  const subtotalCents = lines.reduce((n, l) => n + Number(l.lineTotalCents ?? 0), 0);
  const shipCents = Math.round(Number(cart?.selectedShipping?.cost ?? 0) * 100) || 0;
  const taxCents = 0; // wire your tax here later
  const totalCents = Math.max(0, subtotalCents + shipCents + taxCents);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Review your cart</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Confirm items and proceed to secure checkout.
          </p>
        </div>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
        >
          Continue shopping
        </a>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Lines */}
        <section className="rounded-2xl border bg-white/80 p-2 shadow-sm backdrop-blur">
          <ul className="divide-y">
            {lines.map((l) => {
              const pid = Number(l.productId);
              const title = nameMap.get(pid) ?? `Product #${pid}`;
              return (
                <li key={l.id} className="group grid grid-cols-[1fr_auto] items-start gap-4 p-5 hover:bg-neutral-50/70">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                        #{pid}
                      </span>
                      <h3 className="text-sm font-semibold leading-6 text-neutral-900">{title}</h3>
                    </div>

                    <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div>
                        <dt className="text-xs text-neutral-500">Quantity</dt>
                        <dd className="text-sm font-medium">{l.quantity}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-neutral-500">Unit</dt>
                        <dd className="text-sm font-medium">
                          {moneyFmt(Number(l.unitPriceCents || 0), currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-neutral-500">Line total</dt>
                        <dd className="text-sm font-semibold">
                          {moneyFmt(Number(l.lineTotalCents || 0), currency)}
                        </dd>
                      </div>
                    </dl>

                    <p className="mt-2 line-clamp-2 text-xs text-neutral-500">
                      Options: {(l.optionIds as number[] | undefined)?.join(", ") || "—"}
                    </p>
                  </div>

                  {/* Remove */}
                  <div className="flex items-start gap-2">
                    <RemoveLineButton
                      lineId={String(l.id)}
                      className="opacity-80 transition group-hover:opacity-100"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Summary */}
        <aside className="lg:sticky lg:top-6">
          <div className="rounded-2xl border bg-white/80 p-6 shadow-sm backdrop-blur">
            <h2 className="text-lg font-semibold">Order summary</h2>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-medium">{moneyFmt(subtotalCents, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">
                  Shipping{cart?.selectedShipping?.method ? ` — ${cart.selectedShipping.method}` : ""}
                </span>
                <span className="font-medium">{moneyFmt(shipCents, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Tax</span>
                <span className="font-medium">{moneyFmt(taxCents, currency)}</span>
              </div>
              <hr className="my-3" />
              <div className="flex items-baseline justify-between">
                <span className="text-base font-semibold">Total</span>
                <span className="text-xl font-bold">{moneyFmt(totalCents, currency)}</span>
              </div>
            </div>

            <a
              href="/checkout"
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/60"
            >
              Proceed to checkout
            </a>
          </div>
        </aside>
      </div>
    </main>
  );
}
