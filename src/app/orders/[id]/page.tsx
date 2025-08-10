// app/orders/[id]/page.tsx
import Link from "next/link";

type OrderSession = {
  id: string;
  userId: string | null;
  productId: string;
  options: (number | string)[] | Record<string, any>;
  files: { type: string; url: string }[];
  shippingInfo: Record<string, any> | null;
  billingInfo: Record<string, any> | null;
  currency: string;
  subtotal: string | number;
  tax: string | number;
  discount: string | number;
  total: string | number;
  selectedShippingRate: [string, string, number, number] | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  sinaliteOrderId: string | null;
  trackingUrl?: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

function currency(value: number | string, code = "USD") {
  const num = typeof value === "string" ? Number(value) : value;
  return num.toLocaleString("en-US", { style: "currency", currency: code });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const res = await fetch(`/api/orders/${params.id}`, { cache: "no-store" });

  if (res.status === 404) {
    return (
      <main className="container py-10">
        <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
        <Link className="btn btn-primary" href="/orders">Back to My Orders</Link>
      </main>
    );
  }
  if (!res.ok) {
    return (
      <main className="container py-10">
        <h1 className="text-2xl font-bold mb-4">Order</h1>
        <p className="text-red-700">Failed to load this order. Please try again.</p>
      </main>
    );
  }

  const order = (await res.json()) as OrderSession;
  const ship = order.selectedShippingRate;
  const currencyCode = (order.currency || "USD") as string;

  return (
    <main className="container py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          Order #{order.sinaliteOrderId ?? order.id.slice(0, 8)}
        </h1>
        <div className="flex flex-wrap gap-3">
          <a
            className="btn btn-secondary"
            href={`/api/orders/${order.id}/invoice`}
            target="_blank"
            rel="noreferrer"
          >
            Download Invoice
          </a>
          {order.trackingUrl ? (
            <a className="btn btn-primary" href={order.trackingUrl} target="_blank" rel="noreferrer">
              Track Package
            </a>
          ) : null}

          {/* 🔁 Reorder = POST to /api/orders/[id]/reorder, which redirects */}
          <form action={`/api/orders/${order.id}/reorder`} method="POST">
            <button type="submit" className="btn btn-primary">Reorder</button>
          </form>

          <Link href="/orders" className="btn">Back</Link>
        </div>
      </div>

      <section className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Summary</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <div className="muted mb-1">Placed</div>
            <div>{new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <div>
            <div className="muted mb-1">Total</div>
            <div className="font-semibold">{currency(order.total, currencyCode)}</div>
          </div>
          <div>
            <div className="muted mb-1">Payment</div>
            <div>{order.stripePaymentIntentId ? "Paid" : "Pending"}</div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Items</h2>
        <div className="muted mb-2">Product: {order.productId}</div>
        <div className="muted">
          Options: {Array.isArray(order.options) ? order.options.join(", ") : JSON.stringify(order.options)}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Artwork</h2>
        {order.files?.length ? (
          <ul className="space-y-2">
            {order.files.map((f, i) => (
              <li key={i} className="flex items-center justify-between border-b pb-2">
                <span>{f.type}</span>
                <a className="text-blue-600 underline" href={f.url} target="_blank" rel="noreferrer">View</a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="muted">No files</div>
        )}
      </section>

      <section className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Shipping</h2>
        {ship ? (
          <>
            <div><strong>Carrier:</strong> {ship[0]}</div>
            <div><strong>Method:</strong> {ship[1]}</div>
            <div><strong>Cost:</strong> {currency(ship[2], currencyCode)}</div>
          </>
        ) : (
          <div className="muted">Not selected</div>
        )}
        <div className="grid md:grid-cols-2 gap-6 mt-4">
          <div>
            <h3 className="font-semibold mb-2">Ship To</h3>
            {order.shippingInfo ? (
              <address className="not-italic">
                {order.shippingInfo.ShipFName} {order.shippingInfo.ShipLName}<br />
                {order.shippingInfo.ShipAddr}{order.shippingInfo.ShipAddr2 ? `, ${order.shippingInfo.ShipAddr2}` : ""}<br />
                {order.shippingInfo.ShipCity}, {order.shippingInfo.ShipState} {order.shippingInfo.ShipZip}<br />
                {order.shippingInfo.ShipCountry}<br />
                {order.shippingInfo.ShipPhone}
              </address>
            ) : <div className="muted">—</div>}
          </div>
          <div>
            <h3 className="font-semibold mb-2">Bill To</h3>
            {order.billingInfo ? (
              <address className="not-italic">
                {order.billingInfo.BillFName} {order.billingInfo.BillLName}<br />
                {order.billingInfo.BillAddr}{order.billingInfo.BillAddr2 ? `, ${order.billingInfo.BillAddr2}` : ""}<br />
                {order.billingInfo.BillCity}, {order.billingInfo.BillState} {order.billingInfo.BillZip}<br />
                {order.billingInfo.BillCountry}<br />
                {order.billingInfo.BillPhone}
              </address>
            ) : <div className="muted">—</div>}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Totals</h2>
        <div className="flex justify-between"><span>Subtotal</span><span>{currency(order.subtotal, currencyCode)}</span></div>
        <div className="flex justify-between"><span>Shipping</span><span>{currency(ship?.[2] ?? 0, currencyCode)}</span></div>
        <div className="flex justify-between"><span>Tax</span><span>{currency(order.tax, currencyCode)}</span></div>
        {Number(order.discount) > 0 && (
          <div className="flex justify-between text-green-700"><span>Discount</span><span>-{currency(order.discount, currencyCode)}</span></div>
        )}
        <hr className="my-2" />
        <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>{currency(order.total, currencyCode)}</span></div>
      </section>
    </main>
  );
}
