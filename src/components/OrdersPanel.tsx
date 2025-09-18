"use client";
import * as React from "react";
import Image from "@/components/ImageSafe";
import Link from "next/link";

// Cloudflare Images URL builder (CDN variants)
import { cfImage } from "@/lib/cfImages";
// Your local product asset refs that include Cloudflare image IDs
import productAssetsRaw from "@/data/productAssets.json";

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

type OrderDTO = {
  id: string;
  orderNumber: string | null;
  placedAt: string | null;
  status: string | null;
  paymentStatus: string | null;
  provider: string | null;
  providerId: string | null;
  currency: "USD" | "CAD" | string | null;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  discountCents: number;
  creditsCents: number;
  totalCents: number;
  representativeProductId: number | null;
};

const CARD_VARIANT = "productThumb" as const;
const CF_PLACEHOLDER_ID = "a90ba357-76ea-48ed-1c65-44fff4401600";

function firstCfIdFromAsset(p?: ProductAsset | null): string | null {
  if (!p) return null;
  const refs = [
    p.cf_image_1_id, p.cf_image_2_id, p.cf_image_3_id, p.cf_image_4_id,
    p.cf_image_id, p.cloudflare_image_id, p.cloudflare_id,
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

function imageForProduct(productId?: number | null): string {
  const pid = Number(productId);
  const row = Number.isFinite(pid) ? productAssetById.get(pid) : undefined;
  const ref = firstCfIdFromAsset(row) ?? CF_PLACEHOLDER_ID;
  if (ref.startsWith("http://") || ref.startsWith("https://")) return ref;
  return cfImage(ref, CARD_VARIANT) || cfImage(ref, "public") || "/placeholder.svg";
}

function money(cents: number, currency?: string | null) {
  const code = (currency === "CAD" ? "CAD" : "USD") as "USD" | "CAD";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format((cents || 0) / 100);
}

function niceDate(s?: string | null) {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function OrdersPanel() {
  const [loading, setLoading] = React.useState(true);
  const [orders, setOrders] = React.useState<OrderDTO[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch("/api/me/orders", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to load orders");
        if (!cancelled) setOrders(data.orders || []);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load orders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6 text-sm text-gray-600">
        Loading orders…
      </div>
    );
  }
  if (err) {
    return (
      <div className="rounded-xl border bg-white p-6 text-sm text-rose-700">
        {err}
      </div>
    );
  }
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-gray-600">
        <p className="text-sm">No orders yet.</p>
        <p className="mt-1 text-xs">Once you place an order, it will appear here automatically.</p>
        <div className="mt-4">
          <Link
            href="/products"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Start shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4">
      {orders.map((o) => {
        const img = imageForProduct(o.representativeProductId ?? undefined);
        const currency = (o.currency === "CAD" ? "CAD" : "USD") as "USD" | "CAD";

        return (
          <li key={o.id} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-start gap-4">
              <Image
                src={img}
                alt="Order"
                width={80}
                height={80}
                className="rounded border object-cover"
                unoptimized
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      o.status === "fulfilled"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : o.status === "cancelled"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    }`}
                  >
                    {o.status || "placed"}
                  </span>
                  {o.paymentStatus && (
                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700">
                      {o.paymentStatus}
                    </span>
                  )}
                  {o.provider && (
                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700">
                      {o.provider}
                    </span>
                  )}
                </div>

                <div className="mt-1 truncate text-sm text-gray-700">
                  <span className="font-medium">
                    {o.orderNumber ? `Order #${o.orderNumber}` : `Order ${o.id.slice(0, 8)}`}
                  </span>
                  {" · "}
                  <span>Placed {niceDate(o.placedAt)}</span>
                </div>

                <div className="mt-2 text-sm text-gray-700">
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <span>Subtotal: <b>{money(o.subtotalCents, currency)}</b></span>
                    <span>Shipping: <b>{money(o.shippingCents, currency)}</b></span>
                    <span>Tax: <b>{money(o.taxCents, currency)}</b></span>
                    {o.creditsCents > 0 && (
                      <span className="text-emerald-700">
                        Loyalty credit: <b>−{money(o.creditsCents, currency)}</b>
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-gray-900">
                    Total: <b>{money(o.totalCents, currency)}</b>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  Tracking will appear here once available per the <b>SinaLite API</b>.
                </div>
              </div>

              <div className="text-right">
                <Link
                  href={`/account/orders/${o.id}`}
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-200"
                >
                  View order
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
