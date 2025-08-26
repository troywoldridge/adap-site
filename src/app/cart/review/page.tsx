import "server-only";
import * as React from "react";
import { cookies, headers } from "next/headers";
import ReviewPageStyles from "@/components/ReviewPageStyles";

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
  name?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  cloudflareImageId?: string | null;
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

const CF_HASH = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH || "pJ0fKvjCAbyoF8aD0BGu8Q";
function mediaUrl(id?: string | null) {
  if (!id) return null;
  // If it already looks like a URL (R2 public URL), return as-is
  if (/^https?:\/\//i.test(id)) return id;
  // Otherwise treat as Cloudflare Images ID
  return `https://imagedelivery.net/${CF_HASH}/${id}/public`;
}

/** Next 14/15 safe headers getter */
async function getHdr() {
  const maybe = headers() as any;
  return typeof maybe?.then === "function" ? await maybe : maybe;
}
/** Next 14/15 safe cookies getter */
async function getJar() {
  const maybe = cookies() as any;
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

/* ────────── load cart via API ────────── */
async function loadCart(): Promise<{
  lines: ReviewLine[];
  subtotal: number;
  currency: Currency;
  selectedShipping: ShippingRate;
  walletBalance: number;
}> {
  // forward all cookies so API sees same session
  const jar = await getJar();
  const cookieHeader = jar.getAll().map((c: any) => `${c.name}=${c.value}`).join("; ");

  // absolute base URL
  const hdrs = await getHdr();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = hdrs.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  const base = `${proto}://${host}`;

  // cart (use your established endpoint)
  const res = await fetch(`${base}/api/cart/current`, {
    headers: { cookie: cookieHeader, accept: "application/json" },
    cache: "no-store",
    next: { revalidate: 0 },
  });

  // wallet (may be 401 if not signed in → treat as 0)
  let walletBalance = 0;
  try {
    const w = await fetch(`${base}/api/loyalty/wallet`, {
      headers: { cookie: cookieHeader, accept: "application/json" },
      cache: "no-store",
    });
    if (w.ok) {
      const wj = await w.json().catch(() => ({}));
      walletBalance = Number(wj?.balance || 0);
    }
  } catch {
    walletBalance = 0;
  }

  if (!res.ok) {
    return { lines: [], subtotal: 0, currency: "USD", selectedShipping: null, walletBalance };
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
      name: l.name ?? null,
      quantity: qty,
      unitPrice: unit,
      lineTotal,
      cloudflareImageId: l.cloudflareImageId ?? null,
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

  return { lines, subtotal, currency, selectedShipping, walletBalance };
}

/* ────────── client widgets ────────── */
function RightSummaryClient(props: {
  currency: Currency;
  subtotal: number;
  selectedShipping: ShippingRate;
  walletBalance: number;
}) {
  "use client";
  const { currency, subtotal, selectedShipping, walletBalance } = props;
  const [redeemPoints, setRedeemPoints] = React.useState(0);

  const shipCost = selectedShipping?.cost ?? 0;
  const preTax = Math.max(0, subtotal + shipCost - redeemPoints / 100);
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="m-0 mb-2 text-base font-extrabold">Order Summary</h2>

      <div className="flex items-center justify-between py-1 text-sm">
        <span className="text-slate-500">Subtotal</span>
        <span className="font-medium">{fmt(subtotal)}</span>
      </div>

      <div className="flex items-center justify-between py-1 text-sm">
        <span className="text-slate-500">Shipping</span>
        <span className="font-medium">
          {selectedShipping ? fmt(shipCost) : "Calculated at checkout"}
        </span>
      </div>

      {/* Loyalty selector */}
      <LoyaltyRedeemer
        balance={walletBalance}
        currency={currency}
        onChange={(pts) => setRedeemPoints(pts)}
      />

      <div className="flex items-center justify-between py-1 text-sm">
        <span className="text-slate-500">Loyalty redemption</span>
        <span className="font-medium">-{fmt(redeemPoints / 100)}</span>
      </div>

      <div className="mt-2 border-t border-gray-200 pt-2">
        <div className="flex items-center justify-between text-[15px] font-extrabold">
          <span>Total (pre-tax)</span>
          <span>{fmt(preTax)}</span>
        </div>
      </div>

      <p className="mt-2 text-[12px] text-slate-500">
        Tax calculated at checkout.
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
  );
}

function LoyaltyRedeemer({
  balance,
  currency,
  onChange,
}: {
  balance: number;
  currency: Currency;
  onChange?: (points: number) => void;
}) {
  "use client";
  const [points, setPoints] = React.useState(0);
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  return (
    <div className="mt-2 rounded-lg border border-gray-200 p-3">
      <div className="text-[13px] font-semibold">Loyalty</div>
      <div className="text-xs text-slate-500">Balance: {balance.toLocaleString()} pts</div>
      <input
        type="range"
        min={0}
        max={balance}
        step={50}
        value={points}
        onChange={(e) => {
          const v = Math.min(balance, Math.max(0, Number(e.currentTarget.value)));
          setPoints(v);
          onChange?.(v);
        }}
        style={{ width: "100%", marginTop: 8 }}
      />
      <div className="mt-1 text-sm">
        Redeem: <strong>{points.toLocaleString()} pts</strong> ({fmt(points / 100)})
      </div>
    </div>
  );
}

/* ────────── page ────────── */
export default async function ReviewCartPage() {
  const { lines, subtotal, currency, selectedShipping, walletBalance } = await loadCart();

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-6 md:py-10">
      <ReviewPageStyles />

      <header className="mb-5 flex items-end justify-between gap-4">
        <h1 className="m-0 text-2xl font-bold tracking-tight">Review Your Order</h1>
        <div className="text-sm text-slate-500">
          {lines.length ? `${lines.length} item${lines.length > 1 ? "s" : ""}` : "No items"}
        </div>
      </header>

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
            {/* List with thumbnails + Change link */}
            <ul className="grid gap-3">
              {lines.map((l) => {
                const thumb =
                  (l.attachments && l.attachments[0]?.storageId && mediaUrl(l.attachments[0].storageId)) ||
                  mediaUrl(l.cloudflareImageId) ||
                  null;

                return (
                  <li key={l.id} className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="grid gap-3 md:grid-cols-[96px_1fr_auto] md:items-start">
                      {/* thumb */}
                      <div className="h-24 w-24 overflow-hidden rounded-lg border border-gray-200 bg-slate-100">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={l.name || `Product ${l.productId}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : null}
                      </div>

                      {/* main */}
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-bold text-slate-900">
                          {l.name || `Product ${l.productId}`}
                        </div>

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

                        {/* Attachments list (if more than one) */}
                        {l.attachments?.length ? (
                          <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                            {l.attachments.map((a) => {
                              const url = mediaUrl(a.storageId);
                              return (
                                <li key={String(a.id)} className="overflow-hidden rounded-lg border border-gray-200">
                                  <div className="relative h-24 w-full">
                                    {url ? (
                                      <img
                                        src={url}
                                        alt={a.fileName || "Artwork"}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                        decoding="async"
                                      />
                                    ) : null}
                                  </div>
                                  <div className="truncate px-2 py-1 text-[12px] text-slate-700">
                                    {a.fileName || "Artwork"}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="mt-4 text-[12px] text-slate-500">No artwork attached yet.</p>
                        )}

                        {/* Change artwork link */}
                        <div className="mt-2">
                          <a
                            href={`/product/${l.productId}/upload-artwork?lineId=${encodeURIComponent(l.id)}`}
                            className="text-sm text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                          >
                            Change artwork
                          </a>
                        </div>
                      </div>

                      {/* right totals */}
                      <div className="text-right">
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
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right: summary (with loyalty redemption) */}
          <aside className="sticky top-24 self-start">
            <RightSummaryClient
              currency={currency}
              subtotal={subtotal}
              selectedShipping={selectedShipping}
              walletBalance={walletBalance}
            />
          </aside>
        </section>
      )}
    </main>
  );
}
