// app/orders/page.tsx
import Link from "next/link";

type OrderRow = {
  id: string;
  productId: string;
  subtotal: string | number;
  tax: string | number;
  discount: string | number;
  total: string | number;
  currency: string;
  sinaliteOrderId: string | null;
  stripePaymentIntentId: string | null;
  createdAt: string;
  updatedAt: string;
  trackingUrl?: string | null;
};

type OrdersApiResponse = {
  page: number;
  pageSize: number;
  total: number;
  data: OrderRow[];
};

function currency(value: number | string, code = "USD") {
  const num = typeof value === "string" ? Number(value) : value;
  return num.toLocaleString("en-US", { style: "currency", currency: code });
}

function StatusBadge({ status }: { status: "paid" | "pending" | "error" | "placed" }) {
  const map = {
    paid: "badge badge-success",
    pending: "badge badge-warning",
    error: "badge badge-danger",
    placed: "badge badge-info",
  } as const;
  return <span className={map[status]}>{status}</span>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: { page?: string; pageSize?: string };
}) {
  const page = Number(searchParams?.page || 1);
  const pageSize = Number(searchParams?.pageSize || 20);

  // Same-origin SSR fetch keeps cookies/Clerk session attached
  const res = await fetch(`/api/orders?page=${page}&pageSize=${pageSize}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <main className="container py-10">
        <h1 className="text-2xl font-bold mb-4">My Orders</h1>
        <p className="text-red-700">Failed to load orders. Please try again.</p>
      </main>
    );
  }

  const data = (await res.json()) as OrdersApiResponse;
  const orders = data.data ?? [];
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <main className="container py-10">
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>

      {orders.length === 0 ? (
        <p className="text-neutral-600">You don’t have any orders yet.</p>
      ) : (
        <>
          <div className="orders-table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Placed</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const status: "paid" | "pending" | "error" | "placed" =
                    o.sinaliteOrderId ? "placed" : o.stripePaymentIntentId ? "paid" : "pending";
                  const orderLabel = o.sinaliteOrderId ?? o.id.slice(0, 8);
                  const currencyCode = (o.currency || "USD") as string;

                  return (
                    <tr key={o.id}>
                      <td>
                        <div className="stack">
                          <strong>#{orderLabel}</strong>
                          <span className="muted">Product: {o.productId}</span>
                        </div>
                      </td>
                      <td>{new Date(o.createdAt).toLocaleString()}</td>
                      <td>{currency(o.total, currencyCode)}</td>
                      <td><StatusBadge status={status} /></td>
                      <td className="text-right">
                        <div className="action-row">
                          <Link href={`/orders/${o.id}`} className="btn btn-link">Details</Link>
                          <a
                            className="btn btn-link"
                            href={`/api/orders/${o.id}/invoice`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Invoice PDF
                          </a>
                          {o.trackingUrl ? (
                            <a
                              className="btn btn-link"
                              href={o.trackingUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Track
                            </a>
                          ) : (
                            <span className="btn btn-link disabled">Track</span>
                          )}
                          {/* 🔁 Reorder (POST) -> clones order session and redirects to product page */}
                          <form action={`/api/orders/${o.id}/reorder`} method="POST">
                            <button type="submit" className="btn btn-primary">Reorder</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <nav className="pagination mt-6">
            <Link
              className={`page-btn ${page <= 1 ? "disabled" : ""}`}
              href={`/orders?page=${Math.max(1, page - 1)}&pageSize=${pageSize}`}
            >
              ← Prev
            </Link>
            <span className="page-count">
              Page {page} of {totalPages}
            </span>
            <Link
              className={`page-btn ${page >= totalPages ? "disabled" : ""}`}
              href={`/orders?page=${Math.min(totalPages, page + 1)}&pageSize=${pageSize}`}
            >
              Next →
            </Link>
          </nav>
        </>
      )}
    </main>
  );
}
