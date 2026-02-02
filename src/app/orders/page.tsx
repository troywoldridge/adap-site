// src/app/orders/page.tsx
import "server-only";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
// If your orders table is exported from a different file, adjust this import:
import { orders } from "@/lib/db/schema/orders";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function money(cents: unknown, cur: "USD" | "CAD" = "USD") {
  const n = Number(cents ?? 0);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n / 100);
  } catch {
    return `$${(n / 100).toFixed(2)}`;
  }
}

export default async function OrdersPage() {
  const { userId } = await auth();
  if (!userId) {
    // If you gate this via middleware you may never hit this, but it’s a safe fallback:
    return (
      <main className="container mx-auto max-w-5xl px-4 py-16">
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Please sign in to view your orders</h1>
          <p className="mt-2 text-gray-600">Once signed in, you’ll see all orders tied to your account.</p>
          <div className="mt-6">
            <Link
              href="/sign-in"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow hover:bg-blue-800"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Securely fetch only this user’s orders, most recent first.
  // We sort by placedAt (when available) then updatedAt as a secondary sort.
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.placedAt), desc(orders.updatedAt))
    .limit(20);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
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
            When you complete checkout, your order will appear here automatically.
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
          {rows.map((o) => {
            // Types note: placedAt/updatedAt are strings in your schema (mode: "string")
            const placedAt =
              o.placedAt ? new Date(o.placedAt as unknown as string).toLocaleString() : undefined;
            const updatedAt =
              o.updatedAt ? new Date(o.updatedAt as unknown as string).toLocaleString() : undefined;

            const when = placedAt ?? updatedAt ?? "—";
            const status = String(o.status ?? "paid");
            const pill =
              status === "paid"
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : status === "processing"
                ? "bg-amber-50 text-amber-700 ring-amber-200"
                : "bg-gray-100 text-gray-700 ring-gray-200";

            const currency: "USD" | "CAD" = (o.currency as any) ?? "USD";

            return (
              <li key={o.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">Order</span>
                      <span className="truncate text-sm text-gray-600">#{String(o.orderNumber ?? o.id).slice(0, 12)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${pill}`}>{status}</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {o.placedAt ? "Placed" : "Last updated"} {when}
                      {o.provider ? <span className="ml-2 text-gray-500">• {o.provider}</span> : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold">{money(o.totalCents, currency)}</div>
                    <div className="mt-1 flex items-center justify-end gap-2">
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
