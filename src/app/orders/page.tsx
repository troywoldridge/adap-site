// src/app/orders/page.tsx
import "server-only";
import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { orders } from "@/db/schema/customer"; // adjust if different
import { desc, eq, or, isNotNull, and } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function money(cents: number, cur: "USD" | "CAD" = "USD") {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format((cents || 0) / 100); }
  catch { return `$${((cents || 0) / 100).toFixed(2)}`; }
}

export default async function OrdersPage() {
  const jar = await cookies();
  const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? "";

  // Pull recent orders for this session (and optionally those without sid if you later attach a user id)
  const rows =
    sid
      ? await db.select().from(orders)
          .where(or(eq(orders.sid as any, sid), isNotNull(orders.sid as any))) // tweak to your auth story
          .orderBy(desc(orders.placedAt as any))
          .limit(20)
      : await db.select().from(orders).orderBy(desc(orders.placedAt as any)).limit(10);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Your Orders</h1>
          <p className="text-sm text-gray-600">Review past purchases, download receipts, and track status.</p>
        </div>
        <Link
          href="/products"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow hover:bg-blue-800"
        >
          Continue shopping
        </Link>
      </header>

      {!rows.length ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-700">No orders yet.</p>
          <p className="mt-2 text-sm text-gray-500">
            Once you complete checkout, your order will appear here automatically.
          </p>
          <div className="mt-4">
            <Link
              href="/products"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow hover:bg-blue-800"
            >
              Browse products
            </Link>
          </div>
        </div>
      ) : (
        <ul className="grid gap-4">
          {rows.map((o: any) => {
            const status = String(o.status || "paid");
            const pill =
              status === "paid"
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : status === "processing"
                ? "bg-amber-50 text-amber-700 ring-amber-200"
                : "bg-gray-100 text-gray-700 ring-gray-200";

            return (
              <li key={o.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">Order</span>
                      <span className="truncate text-sm text-gray-600">#{String(o.id).slice(0, 8)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${pill}`}>
                        {status}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      Placed {o.placedAt ? new Date(o.placedAt).toLocaleString() : "—"}
                      {o.shipping?.method ? (
                        <span className="ml-2 text-gray-500">• {o.shipping.carrier} {o.shipping.method}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold">{money(o.totalCents ?? 0, (o.currency as any) ?? "USD")}</div>
                    <div className="mt-1 flex items-center justify-end gap-2">
                      {/* Wire these routes when you have detail/invoice pages */}
                      <Link href={`/orders/${o.id}`} className="text-sm font-medium text-blue-700 hover:underline">
                        View details
                      </Link>
                      {/* <Link href={`/orders/${o.id}/invoice`} className="text-sm text-gray-700 hover:underline">Invoice</Link> */}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
