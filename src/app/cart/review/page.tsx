// src/app/cart/review/page.tsx
import "server-only";
import { cookies, headers } from "next/headers";
import ReviewPageStyles from "@/components/ReviewPageStyles";
import { cfUrl } from "@/lib/data";

export const dynamic = "force-dynamic";

/* ───────────────── types ───────────────── */
type Currency = "USD" | "CAD";

type ShippingRate = {
  carrier: string;
  method: string;
  cost: number;
  days: number | null;
  currency: Currency;
} | null;

type ReviewLine = {
  id: string;
  productId: number | string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  optionsByGroup?: Record<string, unknown>;
  attachments?: { id: string | number; storageId: string; fileName?: string }[];
};

/* ────────── helpers ────────── */
function fmtCurrency(value: number, currency: Currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/* ────────── load cart via the same API as Cart page ────────── */
async function loadCart(): Promise<{
  lines: ReviewLine[];
  subtotal: number;
  currency: Currency;
  selectedShipping: ShippingRate;
}> {
  // forward all cookies so the API sees the same session
  const jar = await cookies();
  const cookieHeader = jar.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  // build absolute base URL for server-to-server fetch
  const hdrs = await headers(); // <-- IMPORTANT: await headers()
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = hdrs.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  const base = `${proto}://${host}`;

  const res = await fetch(`${base}/api/cart`, {
     headers: { cookie: cookieHeader, accept: "application/json" },
     cache: "no-store",
     next: { revalidate: 0 },
   });

  if (!res.ok) {
    return { lines: [], subtotal: 0, currency: "USD", selectedShipping: null };
  }

  const data = await res.json();

  const rawLines = (data?.items ?? data?.lines ?? []) as any[];

  const lines: ReviewLine[] = rawLines.map((l: any, idx: number) => {
    const qty = Number(l.quantity ?? l.qty) > 0 ? Number(l.quantity ?? l.qty) : 1;
    const unit = Number(l.serverUnitPrice ?? l.unitPrice ?? l.price ?? 0) || 0;
    const lineTotal = Number(l.lineTotal ?? l.total) || unit * qty;

    return {
      id: String(l.id ?? l.lineId ?? idx),
      productId: l.productId ?? l.product_id ?? "",
      quantity: qty,
      unitPrice: unit,
      lineTotal,
      optionsByGroup: l.optionsByGroup ?? {},
      attachments: Array.isArray(l.attachments) ? l.attachments : [],
    };
  });

  const subtotal: number =
    Number(data?.subtotal) ||
    lines.reduce((sum, it) => sum + (Number(it.lineTotal) || 0), 0);

  const currency: Currency = data?.currency === "CAD" ? "CAD" : "USD";

  const ship = data?.selectedShipping ?? data?.shipping ?? null;
  const selectedShipping: ShippingRate = ship
    ? {
        carrier: String(ship.carrier ?? ""),
        method: String(ship.method ?? ""),
        cost: Number(ship.cost ?? 0) || 0,
        days: typeof ship.days === "number" ? ship.days : null,
        currency,
      }
    : null;

  return { lines, subtotal, currency, selectedShipping };
}

/* ────────── page ────────── */
export default async function ReviewCartPage() {
  const { lines, subtotal, currency, selectedShipping } = await loadCart();

  const shippingCost = selectedShipping?.cost ?? null;
  const rewardsValue = subtotal * 0.02; // tweak if your rewards program differs
  const preTaxTotal = subtotal + (shippingCost ?? 0);

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-6 md:py-10">
      {/* page-scoped CSS (client component that only injects styles) */}
      <ReviewPageStyles />

      {/* Header */}
      <header className="mb-5 flex items-end justify-between gap-4">
        <h1 className="m-0 text-2xl font-bold tracking-tight">Review Your Order</h1>
        <div className="text-sm text-slate-500">
          {lines.length ? `${lines.length} item${lines.length > 1 ? "s" : ""}` : "No items"}
        </div>
      </header>

      {/* Empty state */}
      {lines.length === 0 ? (
        <section className="rounded-xl border border-gray-200 bg-white p-4 text-slate-600">
          Your cart is empty. Browse products and add items to continue.
          <div className="mt-3">
            <a
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to shopping
            </a>
          </div>
        </section>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          {/* Left: lines */}
          <div className="grid gap-3">
            {lines.map((l) => (
              <article key={l.id} className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  {/* Details */}
                  <div>
                    <div className="font-bold text-slate-900">Product #{l.productId}</div>

                    {/* Options */}
                    {l.optionsByGroup && Object.keys(l.optionsByGroup).length > 0 && (
                      <dl className="mt-1 grid gap-x-4 gap-y-0.5 text-[12px] text-slate-700 sm:grid-cols-3">
                        {Object.entries(l.optionsByGroup).map(([k, v]) => (
                          <div key={k} className="contents sm:block">
                            <dt className="inline text-slate-500 sm:block">{k}</dt>{" "}
                            <dd className="inline font-semibold sm:block">{String(v)}</dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    {/* Artwork thumbnails (Cloudflare Images via cfUrl) */}
                    {l.attachments?.length ? (
                      <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                        {l.attachments.map((a: any) => (
                          <li key={a.id} className="overflow-hidden rounded-lg border border-gray-200">
                            <div className="relative h-24 w-full">
                              <img
                                src={cfUrl(a.storageId)}
                                alt={a.fileName || "Artwork"}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            </div>
                            <div className="truncate px-2 py-1 text-[12px] text-slate-700">
                              {a.fileName || "Artwork"}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 text-[12px] text-slate-500">No artwork attached yet.</p>
                    )}
                  </div>

                  {/* Figures */}
                  <div className="space-y-1 text-right">
                    <div className="text-sm text-slate-500">
                      Qty: <span className="text-slate-900">{l.quantity}</span>
                    </div>
                    <div className="text-sm text-slate-500">
                      Unit: <span className="text-slate-900">{fmtCurrency(l.unitPrice, currency)}</span>
                    </div>
                    <div className="text-sm text-slate-500">
                      Line total:{" "}
                      <span className="font-extrabold text-slate-900">
                        {fmtCurrency(l.lineTotal, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Right: summary (no estimator here) */}
          <aside className="sticky top-24 self-start">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="m-0 mb-2 text-base font-extrabold">Order Summary</h2>

              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">{fmtCurrency(subtotal, currency)}</span>
              </div>

              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-slate-500">Shipping</span>
                <span className="font-medium">
                  {shippingCost != null ? fmtCurrency(shippingCost, currency) : "Calculated at checkout"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-slate-500">Rewards you’ll earn (est.)</span>
                <span className="font-medium">{fmtCurrency(rewardsValue, currency)}</span>
              </div>

              <div className="mt-2 border-t border-gray-200 pt-2">
                <div className="flex items-center justify-between text-[15px] font-extrabold">
                  <span>Total (pre-tax)</span>
                  <span>{fmtCurrency(preTaxTotal, currency)}</span>
                </div>
              </div>

              <p className="mt-2 text-[12px] text-slate-500">
                Final shipping & taxes are confirmed at checkout per SinaLite’s rates.
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <a
                  href="/"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Back to shopping
                </a>
                <a
                  href="/checkout"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-transparent bg-blue-700 px-4 font-bold text-white hover:bg-blue-800"
                >
                  Continue to checkout
                </a>
              </div>
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}
