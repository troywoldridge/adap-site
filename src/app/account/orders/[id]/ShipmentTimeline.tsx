// src/app/account/orders/[id]/ShipmentTimeline.tsx
"use client";
import * as React from "react";

type Shipment = {
  carrier: string;
  trackingNumber: string;
  status: string;
  eta?: string | null;
  events?: { time: string; description: string; location?: string }[];
};

export default function ShipmentTimeline({ orderId }: { orderId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [shipments, setShipments] = React.useState<Shipment[]>([]);

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(`/api/me/shipments?orderId=${encodeURIComponent(orderId)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load tracking");
        if (!cancel) setShipments(data.shipments || []);
      } catch (e: any) {
        if (!cancel) setErr(e?.message || "Failed to load tracking");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [orderId]);

  if (loading) {
    return <div className="text-sm text-gray-600">Loading…</div>;
  }
  if (err) {
    return <div className="text-sm text-rose-700">{err}</div>;
  }
  if (!shipments.length) {
    return <div className="text-sm text-gray-600">No tracking yet.</div>;
  }

  return (
    <div className="space-y-4">
      {shipments.map((s, i) => (
        <div key={i} className="rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-gray-900">
              {s.carrier} • {s.trackingNumber}
            </div>
            <div className="text-xs text-gray-600">
              Status: <span className="rounded-md bg-gray-100 px-2 py-0.5">{s.status}</span>
              {s.eta ? ` • ETA ${s.eta}` : ""}
            </div>
          </div>

          {s.events && s.events.length > 0 && (
            <ol className="mt-3 space-y-2 text-sm text-gray-700">
              {s.events.map((e, j) => (
                <li key={j} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-gray-400" />
                  <div>
                    <div className="text-gray-900">{e.description}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(e.time).toLocaleString()}
                      {e.location ? ` • ${e.location}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}
