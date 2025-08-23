"use client";

type Props = {
  initialOrders: any[];
};

export default function AccountClient({ initialOrders }: Props) {
  const orders = Array.isArray(initialOrders) ? initialOrders : [];

  return (
    <main className="container" style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <h1 style={{ margin: "0 0 16px" }}>Your Account</h1>

      <section>
        <h2 style={{ margin: "12px 0" }}>Recent orders</h2>

        {orders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {orders.map((o: any) => (
              <li
                key={o.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  Order #{o.id ?? "—"}{" "}
                  <span style={{ fontWeight: 400, color: "#64748b" }}>
                    {o.status ?? "NEW"}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: "#475569" }}>
                  Placed {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}
                </div>
                <div style={{ marginTop: 6 }}>
                  Total:{" "}
                  <strong>
                    {o.currency ?? "USD"}{" "}
                    {typeof o.total === "number" ? o.total.toFixed(2) : "—"}
                  </strong>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
