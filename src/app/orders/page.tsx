// src/app/orders/page.tsx
export const dynamic = "force-dynamic";

import { headers, cookies } from "next/headers";
import Link from "next/link";

type OrderSummary = {
  id: string | number;
  total?: number;
  status?: string;
  createdAt?: string; // or created_time depending on your API
};

async function getCookieJar() {
  const c = cookies() as any;
  return typeof c?.then === "function" ? await c : c;
}

async function baseUrl(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function fetchOrders(page = 1, pageSize = 20) {
  const b = await baseUrl();
  const jar = await getCookieJar();
  const cookieHeader =
    jar?.getAll?.().map((c: any) => `${c.name}=${c.value}`).join("; ") ?? "";

  // Try /api/orders first, then /api/me/orders as a fallback
  const endpoints = ["/api/orders", "/api/me/orders"];

  for (const ep of endpoints) {
    const url = new URL(`${b}${ep}`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));

    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    });

    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      // Normalize a couple of shapes:
      const orders: OrderSummary[] =
        json?.orders ??
        json?.data ??
        json ??
        [];

      const total =
        Number(json?.total ?? json?.count ?? orders.length) || orders.length;

      return { orders, total, source: ep };
    }

    // If 404/401/etc, continue to next endpoint
  }

  return { orders: [] as OrderSummary[], total: 0, source: null as string | null };
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const page = Number(
    (Array.isArray(searchParams?.page)
      ? searchParams?.page[0]
      : searchParams?.page) ?? 1
  ) || 1;

  const pageSize = Number(
    (Array.isArray(searchParams?.pageSize)
      ? searchParams?.pageSize[0]
      : searchParams?.pageSize) ?? 20
  ) || 20;

  const { orders, total } = await fetchOrders(page, pageSize);

  return (
    <main className="container" style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>Your Orders</h1>

      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {orders.map((o) => {
            // Try a few common shapes from your API
            const id = (o as any).id ?? (o as any).orderId;
            const status =
              (o as any).status ??
              (o as any).order_status ??
              "NEW";
            const totalAmount =
              Number((o as any).total ?? (o as any).amount_total ?? 0);
            const created =
              (o as any).createdAt ??
              (o as any).created_time ??
              (o as any).created ??
              null;

            return (
              <li
                key={String(id)}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Order #{String(id)}</div>
                    <div style={{ color: "#64748b", fontSize: 13 }}>
                      {created ? new Date(created).toLocaleString() : ""}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      Status: <strong>{String(status)}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>
                      {Number.isFinite(totalAmount) ? `$${totalAmount.toFixed(2)}` : ""}
                    </div>
                    <Link
                      href={`/orders/${encodeURIComponent(String(id))}`}
                      style={{
                        display: "inline-block",
                        marginTop: 6,
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      View details
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Simple pager (optional) */}
      {total > pageSize && (
        <nav style={{ marginTop: 12, display: "flex", gap: 8 }}>
          {page > 1 && (
            <Link
              href={`/orders?page=${page - 1}&pageSize=${pageSize}`}
              style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6 }}
            >
              ← Prev
            </Link>
          )}
          {page * pageSize < total && (
            <Link
              href={`/orders?page=${page + 1}&pageSize=${pageSize}`}
              style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6 }}
            >
              Next →
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
