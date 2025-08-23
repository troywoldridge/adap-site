"use client";

import { useEffect, useState } from "react";

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  currency: string;
  placedAt: string | null;
};

type SummaryResponse = {
  ok: boolean;
  profile: { displayName?: string; email?: string; marketingOptIn?: boolean };
  points: number;
  recentOrders: OrderRow[];
};

export default function AccountClient() {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me/summary", { cache: "no-store" });
        const json = (await res.json()) as SummaryResponse;
        setData(json);
      } catch (e) {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p>Loading…</p>;
  if (!data?.ok) return <p>Could not load account.</p>;

  const { profile, points, recentOrders } = data;

  return (
    <div className="grid gap-8">
      <section className="card">
        <h2 className="h2">Loyalty</h2>
        <p className="muted">Points balance</p>
        <div className="points">{points.toLocaleString()}</div>
        <a className="link" href="/account/loyalty">View activity</a>
      </section>

      <section className="card">
        <h2 className="h2">Recent Orders</h2>
        {recentOrders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Order</th><th>Status</th><th>Total</th><th>Date</th></tr>
            </thead>
            <tbody>
              {recentOrders.map(o => (
                <tr key={o.id}>
                  <td><a className="link" href={`/account/orders/${o.id}`}>{o.orderNumber}</a></td>
                  <td>{o.status}</td>
                  <td>{(o.totalCents / 100).toLocaleString(undefined, { style: "currency", currency: o.currency })}</td>
                  <td>{o.placedAt ? new Date(o.placedAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <a className="link" href="/account/orders">All orders</a>
      </section>

      <section className="card">
        <h2 className="h2">Profile</h2>
        <p><strong>Name:</strong> {profile.displayName ?? "—"}</p>
        <p><strong>Email:</strong> {profile.email ?? "—"}</p>
        <p><strong>Marketing:</strong> {profile.marketingOptIn ? "Opted-in" : "Opted-out"}</p>
        <a className="link" href="/account/profile">Edit profile</a>
        <a className="link" href="/account/addresses">Manage addresses</a>
      </section>
    </div>
  );
}
