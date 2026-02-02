// src/app/account/orders/[id]/page.tsx
import "server-only";

import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { eq, inArray } from "drizzle-orm";

import Image from "@/components/ImageSafe";

import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema/orders";
import { cartLines } from "@/lib/db/schema/cartLines";
import { cartArtwork } from "@/lib/db/schema/cartArtwork";

// Cloudflare Images URL builder
import { cfImage } from "@/lib/cfImages";

// Local product assets (CF image IDs live here)
import productAssetsRaw from "@/data/productAssets.json";

// Client tracking timeline for live updates (SinaLite proxied)
import ShipmentTimeline from "./ShipmentTimeline";

/* ------------------------------ helpers ------------------------------ */
type ProductAsset = {
  id?: number | string | null;
  name?: string | null;
  cf_image_id?: string | null;
  cf_image_1_id?: string | null;
  cf_image_2_id?: string | null;
  cf_image_3_id?: string | null;
  cf_image_4_id?: string | null;
  cloudflare_id?: string | null;
  cloudflare_image_id?: string | null;
  [k: string]: unknown;
};

const CARD_VARIANT = "productThumb" as const;
const CF_PLACEHOLDER_ID = "a90ba357-76ea-48ed-1c65-44fff4401600";

function firstCfIdFromAsset(p?: ProductAsset | null): string | null {
  if (!p) return null;
  const refs = [
    p.cf_image_1_id,
    p.cf_image_2_id,
    p.cf_image_3_id,
    p.cf_image_4_id,
    p.cf_image_id,
    p.cloudflare_image_id,
    p.cloudflare_id,
  ]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  return refs[0] || null;
}

const productAssetById = new Map<number, ProductAsset>();
for (const p of productAssetsRaw as ProductAsset[]) {
  const id = Number(p?.id);
  if (Number.isFinite(id) && !productAssetById.has(id)) {
    productAssetById.set(id, p);
  }
}

function productImg(productId?: number | string | null): string {
  const pid = Number(productId);
  const row = Number.isFinite(pid) ? productAssetById.get(pid) : undefined;
  const ref = firstCfIdFromAsset(row) ?? CF_PLACEHOLDER_ID;
  if (ref.startsWith("http://") || ref.startsWith("https://")) return ref;
  return cfImage(ref, CARD_VARIANT) || cfImage(ref, "public") || "/placeholder.svg";
}

function moneyFmt(cents: number, currency: "USD" | "CAD") {
  const dollars = (Number(cents) || 0) / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(dollars);
}

function niceDate(s?: string | null) {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_STYLES: Record<string, string> = {
  fulfilled: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  processing: "bg-amber-50 text-amber-800 ring-amber-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  placed: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  default: "bg-gray-50 text-gray-700 ring-gray-200",
};

/* ------------------------------ types for selects ------------------------------ */
type OrderRow = typeof orders.$inferSelect;

type LineRow = {
  id: string;
  productId: number | string;
  quantity: number | string;
  unitPriceCents: number | string | null;
  lineTotalCents: number | string | null;
  optionIds: (number | string)[] | null;
};

/* ------------------------------ loader ------------------------------ */
async function loadOrder(orderId: string) {
  const { userId } = await auth();

  // Next can be sync or async depending on version — await is safe either way.
  const jar = await cookies();
  const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? null;

  const { select, update } = db;

  const o =
    (await select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1))?.[0] as OrderRow | undefined;

  if (!o) return null;

  // ownership (guest → user claim)
  const candidates = [userId, sid].filter(Boolean) as string[];
  if (!candidates.includes(String(o.userId))) {
    if (userId && String(o.userId) === String(sid)) {
      await update(orders).set({ userId }).where(eq(orders.id, orderId));
      (o as any).userId = userId;
    } else {
      return null;
    }
  }

  // lines
  const cartId = (o as any).cartId as string | null | undefined;

  const lineRows: LineRow[] = cartId
    ? (await select({
        id: cartLines.id,
        productId: cartLines.productId,
        quantity: cartLines.quantity,
        unitPriceCents: cartLines.unitPriceCents,
        lineTotalCents: cartLines.lineTotalCents,
        optionIds: cartLines.optionIds,
      })
        .from(cartLines)
        .where(eq(cartLines.cartId, cartId))) as unknown as LineRow[]
    : [];

  // artwork by line
  const artMap = new Map<string, string[]>();
  if (lineRows.length) {
    const ids = lineRows.map((l) => String(l.id)).filter(Boolean);

    if (ids.length) {
      const arts = (await select({
        cartLineId: cartArtwork.cartLineId,
        url: cartArtwork.url,
      })
        .from(cartArtwork)
        .where(inArray(cartArtwork.cartLineId, ids as string[]))) as unknown as Array<{
        cartLineId: string;
        url: string;
      }>;

      for (const a of arts) {
        const key = String(a.cartLineId);
        if (!artMap.has(key)) artMap.set(key, []);
        artMap.get(key)!.push(String(a.url));
      }
    }
  }

  return { o, lines: lineRows, artMap };
}

/* ------------------------------ page ------------------------------ */
export default async function OrderDetailsPage({ params }: { params: { id: string } }) {
  const data = await loadOrder(params.id);
  if (!data) notFound();

  const { o, lines, artMap } = data;

  const currency = (o.currency === "CAD" ? "CAD" : "USD") as "USD" | "CAD";
  const statusClass = STATUS_STYLES[String(o.status)] || STATUS_STYLES.default;

  const subtotal = Number((o as any).subtotalCents) || 0;
  const ship = Number((o as any).shippingCents) || 0;
  const tax = Number((o as any).taxCents) || 0;
  const credits = Number((o as any).creditsCents ?? 0);
  const total = Number((o as any).totalCents) || 0;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-8">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl border border-transparent bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 p-[1px] shadow-lg">
        <div className="rounded-3xl bg-white/95 p-6 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                {(o as any).orderNumber ? `Order #${(o as any).orderNumber}` : `Order ${String(o.id).slice(0, 8)}`}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Placed {niceDate(((o as any).placedAt ?? (o as any).createdAt) as any)} •{" "}
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClass}`}
                >
                  {String((o as any).status)}
                </span>
                {(o as any).paymentStatus ? (
                  <>
                    {" "}
                    •{" "}
                    <span className="rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-200">
                      {String((o as any).paymentStatus)}
                    </span>
                  </>
                ) : null}
              </p>
            </div>

            {/* ACTIONS */}
            <div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
              <Link
                href={`/account/orders/${String(o.id)}/invoice`}
                className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-800 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
              >
                View / Download PDF
              </Link>

              <form action={`/api/orders/${String(o.id)}/invoice/email`} method="post" className="print:hidden">
                <button
                  className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50"
                  formMethod="post"
                >
                  Email me this invoice
                </button>
              </form>

              <a
                href={`/api/orders/${String(o.id)}/artwork.zip`}
                className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-800 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
              >
                Download artwork (.zip)
              </a>

              <Link
                href={`/account/orders/${String(o.id)}/reorder`}
                className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                Reorder
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: items */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Items</h2>
          <ul className="space-y-4">
            {lines.map((l) => {
              const qty = Number((l as any).quantity ?? 0);
              const unit = Number((l as any).unitPriceCents ?? 0);
              const lineTotal = Number.isFinite(Number((l as any).lineTotalCents))
                ? Number((l as any).lineTotalCents)
                : unit * qty;

              const img = productImg((l as any).productId);
              const arts = artMap.get(String((l as any).id)) ?? [];

              return (
                <li key={String((l as any).id)} className="rounded-2xl border bg-white p-4 shadow-sm">
                  <div className="flex gap-4">
                    <Image
                      src={img}
                      alt="Product"
                      width={96}
                      height={96}
                      className="rounded border object-cover"
                      unoptimized
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900">Product {String((l as any).productId)}</div>
                      <div className="text-sm text-gray-600">
                        Qty {qty} • {moneyFmt(unit, currency)} each
                      </div>

                      {arts.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {arts.map((u, i) => (
                            <a
                              key={`${String((l as any).id)}-art-${i}`}
                              href={u}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center rounded-lg bg-white px-2 py-1 text-xs font-semibold text-gray-800 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
                            >
                              Artwork {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right font-semibold text-gray-900">{moneyFmt(lineTotal, currency)}</div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Tracking timeline */}
          <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Tracking</h3>
            <ShipmentTimeline orderId={String(o.id)} />
            <p className="mt-2 text-xs text-gray-500">
              Status is synced via your backend per the <b>SinaLite API</b> documentation.
            </p>
          </div>
        </section>

        {/* Right: totals + addresses */}
        <aside className="space-y-6">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Summary</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{moneyFmt(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{moneyFmt(ship, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{moneyFmt(tax, currency)}</span>
              </div>
              {credits > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Loyalty credit</span>
                  <span>−{moneyFmt(credits, currency)}</span>
                </div>
              )}
              <hr className="my-2" />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{moneyFmt(total, currency)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Billing & Shipping</h3>
            <div className="mt-3 grid grid-cols-1 gap-4 text-sm text-gray-700">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Billing</div>
                <div className="mt-1">
                  {(o as any).billingAddressId ? <span>On-file billing address</span> : <span>—</span>}
                </div>
                {(o as any).billingAddressId && (
                  <form action={`/api/me/addresses/${String((o as any).billingAddressId)}/default`} method="post" className="mt-2">
                    <button
                      className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50"
                      formMethod="post"
                    >
                      Make default billing
                    </button>
                  </form>
                )}
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Shipping</div>
                <div className="mt-1">
                  {(o as any).shippingAddressId ? <span>On-file shipping address</span> : <span>—</span>}
                </div>
                {(o as any).shippingAddressId && (
                  <form action={`/api/me/addresses/${String((o as any).shippingAddressId)}/default`} method="post" className="mt-2">
                    <button
                      className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50"
                      formMethod="post"
                    >
                      Make default shipping
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Need help?</h3>
            <p className="mt-2 text-sm text-gray-600">Questions about this order? We’re here to help.</p>
            <a
              href={`/support/new?orderId=${String(o.id)}`}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50"
            >
              Contact support
            </a>
          </div>
        </aside>
      </div>
    </main>
  );
}
