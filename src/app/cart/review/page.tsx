// src/app/cart/review/page.tsx
import "server-only";
import Image from "next/image";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { carts, cartLines, cartAttachments } from "@/db/schema";
import { and, eq } from "drizzle-orm";

import { cfUrl } from "@/lib/data";
import CartShippingEstimator from "@/components/CartShippingEstimator";

/** ─────────────────────────────────────────────────────────────
 * Utilities
 * ────────────────────────────────────────────────────────────*/
const SID_COOKIE = "sid";

function toNumArray(u: unknown): number[] {
  if (!Array.isArray(u)) {
    return [];
  }
  const out: number[] = [];
  for (const v of u) {
    const n = Number(v as any);
    if (Number.isFinite(n)) {
      out.push(n);
    }
  }
  return out;
}

function toMoney(n: unknown): number {
  const x = Number(n as any);
  return Number.isFinite(x) ? x : 0;
}

function fmtCurrency(value: number, currency: "USD" | "CAD" = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    // ultra-safe fallback
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** ─────────────────────────────────────────────────────────────
 * Data load
 * ────────────────────────────────────────────────────────────*/
async function loadCart() {
  const sid = cookies().get(SID_COOKIE)?.value || "";

  // 1) Ensure open cart
  const cart = await db.query.carts.findFirst({
    where: and(eq(carts.sid, sid), eq(carts.status, "open")),
  });
  if (!cart) {
    return { id: "", currency: "USD" as const, lines: [] as any[], subtotal: 0 };
  }

  // 2) Load lines
  const lines = await db.query.cartLines.findMany({
    where: eq(cartLines.cartId, cart.id),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

  // 3) Attachments (thumbnails of uploads)
  const lineIds = lines.map((l) => l.id);
  const attachments = lineIds.length
    ? await db.query.cartAttachments.findMany({
        where: (fields, { inArray }) => inArray(fields.lineId, lineIds.map(String)),
      })
    : [];

  // 4) Enrich + compute line totals
  //    NOTE: unitPrice is stored as numeric/decimal in DB (string via Drizzle); normalize to number.
  const enriched = lines.map((l) => {
    const optionIds = toNumArray(l.optionIds);
    const unit = toMoney(l.unitPrice);
    const qty = Math.max(1, Number(l.quantity) || 1);
    const lineTotal = unit * qty;

    const attachmentsForLine = attachments.filter((a) => a.lineId === String(l.id));

    return {
      id: l.id,
      productId: l.productId,
      optionIds,
      quantity: qty,
      unitPrice: unit,
      lineTotal,
      // Optional JSONB columns you added in schema:
      optionsByGroup: (l as any).optionsByGroup || {},
      artworkMap: (l as any).artwork || {},
      attachments: attachmentsForLine,
    };
  });

  const subtotal = enriched.reduce((sum, it) => sum + it.lineTotal, 0);

  // Currency: if you store it per-line from Sinalite later, you can infer from the first line;
  // for now default to USD (your hooks derive CAD if user selects CA in estimator).
  const currency: "USD" | "CAD" = "USD";

  return { id: cart.id, currency, lines: enriched, subtotal };
}

/** ─────────────────────────────────────────────────────────────
 * Page
 * ────────────────────────────────────────────────────────────*/
export default async function ReviewCartPage() {
  const { lines, subtotal, currency } = await loadCart();

  // Normalize for the estimator
  const estimateLines = lines.map((l) => ({
    productId: l.productId,
    optionIds: l.optionIds,
    quantity: l.quantity,
  }));

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <header className="flex items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Review Your Order</h1>
        <div className="text-sm text-gray-500">
          {lines.length > 0 ? `${lines.length} item${lines.length > 1 ? "s" : ""}` : "No items"}
        </div>
      </header>

      {/* Empty state */}
      {lines.length === 0 && (
        <section
          aria-label="Empty cart"
          className="rounded-lg border bg-white p-6 text-sm text-gray-600"
        >
          Your cart is empty. Browse products and add items to continue.
        </section>
      )}

      {/* Lines */}
      {lines.length > 0 && (
        <section className="space-y-4">
          {lines.map((l) => (
            <article key={l.id} className="rounded-lg border bg-white p-4">
              {/* Line header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">Product #{l.productId}</div>
                  {/* Options summary (group → value) */}
                  {l.optionsByGroup && Object.keys(l.optionsByGroup).length > 0 && (
                    <dl className="mt-1 text-xs text-gray-600 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                      {Object.entries(l.optionsByGroup).map(([k, v]) => (
                        <div key={k} className="truncate">
                          <dt className="inline text-gray-500">{k}: </dt>
                          <dd className="inline font-medium">{String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Qty: {l.quantity}</div>
                  <div className="text-sm">
                    <span className="text-gray-500">Unit:</span>{" "}
                    <span className="font-medium">{fmtCurrency(l.unitPrice, currency)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Line total:</span>{" "}
                    <span className="font-semibold">{fmtCurrency(l.lineTotal, currency)}</span>
                  </div>
                </div>
              </div>

              {/* Artwork / uploads */}
              <div className="mt-4">
                {l.attachments && l.attachments.length > 0 ? (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {l.attachments.map((a: any) => {
                      // a.storageId is your Cloudflare Images ID
                      const url = cfUrl(a.storageId);
                      // We can use <Image> for CF URLs (whitelisted in next.config)
                      return (
                        <li key={a.id} className="overflow-hidden rounded border">
                          <div className="relative h-24 w-full">
                            <Image
                              src={url}
                              alt={a.fileName || "Artwork"}
                              fill
                              sizes="176px"
                              className="object-cover"
                            />
                          </div>
                          <div className="truncate px-2 py-1 text-xs text-gray-700">
                            {a.fileName || "Artwork"}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500">No artwork attached yet.</p>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Summary + Shipping */}
      {lines.length > 0 && (
        <section className="grid gap-6 md:grid-cols-3">
          {/* Order Summary */}
          <aside className="rounded-lg border bg-white p-4 md:col-start-3 md:row-span-2 h-fit">
            <h2 className="text-lg font-semibold">Order Summary</h2>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">{fmtCurrency(subtotal, currency)}</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Taxes and shipping are calculated at checkout.
            </p>

            <a
              href="/checkout"
              className="mt-4 inline-block w-full rounded bg-black px-4 py-2 text-center text-white hover:opacity-90"
            >
              Continue to checkout
            </a>
          </aside>

          {/* Shipping Estimator */}
          <div className="md:col-span-2">
            <div className="rounded-lg border bg-white p-4">
              <CartShippingEstimator lines={estimateLines} />
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
