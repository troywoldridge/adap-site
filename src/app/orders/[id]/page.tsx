// src/app/orders/[id]/page.tsx
import "server-only";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

type ApiOk = { ok: true; order: any; items?: any[] };
type ApiErr = { ok: false; error: string };

async function baseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function getOrder(id: string) {
  const url = `${await baseUrl()}/api/orders/${encodeURIComponent(id)}`;
  const res = await fetch(url, { cache: "no-store" });
  let json: ApiOk | ApiErr | null = null;
  try {
    json = (await res.json()) as ApiOk | ApiErr;
  } catch {
    /* ignore */
  }

  if (!res.ok || !json || !("ok" in json) || !json.ok) {
    return null;
  }

  return {
    order: json.order,
    items: Array.isArray(json.items) ? json.items : [],
  };
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const data = await getOrder(id);
  if (!data) return notFound();

  const { order, items } = data;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Order #{order?.id ?? id}</h1>
        <p className="text-sm text-gray-600">
          Status: <span className="font-medium">{order?.status ?? "Unknown"}</span>
        </p>
      </header>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold mb-3">Summary</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-gray-500">Total</dt>
            <dd className="font-medium">
              {order?.total ?? order?.amount_total ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd className="font-medium">
              {order?.created_time ?? order?.createdAt ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Shipping Method</dt>
            <dd className="font-medium">{order?.ShipMethod ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium">{order?.ShipEmail ?? order?.email ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold mb-3">Items</h2>
        {items.length === 0 ? (
          <p className="text-sm text-gray-600">No line items.</p>
        ) : (
          <ul className="divide-y">
            {items.map((it: any, i: number) => (
              <li key={it.id ?? i} className="py-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      Product #{it.product_id ?? it.productId ?? "—"}
                    </div>
                    <div className="text-gray-600">
                      Qty: {it.quantity ?? it.qty ?? 1}
                    </div>
                  </div>
                  <div className="font-semibold">
                    {it.total ?? it.price ?? it.amount_total ?? "—"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Debug (optional): remove if you don’t want JSON */}
      {/* <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto">
        {JSON.stringify({ order, items }, null, 2)}
      </pre> */}
    </main>
  );
}
