"use client";
import * as React from "react";

type Row = {
  id: string;
  type: "earn" | "redeem" | "adjust" | string;
  pointsDelta: number;
  orderId?: string | null;
  note?: string | null;
  createdAt: string;
};

export default function RewardsHistory() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/me/loyalty/history", { credentials: "include", cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed");
        setRows(data.rows || []);
      } catch (e: any) {
        setErr(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-sm text-gray-600">Loading…</div>;
  if (err) return <div className="text-sm text-rose-700">{err}</div>;
  if (rows.length === 0) return <div className="text-sm text-gray-600">No loyalty activity yet.</div>;

  const color = (t: string) => t === "earn" ? "text-emerald-700" : t === "redeem" ? "text-rose-700" : "text-gray-700";
  const sign = (t: string) => t === "earn" ? "+" : t === "redeem" ? "−" : "";

  return (
    <div className="overflow-hidden rounded-2xl border">
      <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Notes</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-600">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50/40">
              <td className="px-4 py-3">{new Date(r.createdAt).toLocaleString()}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ring-gray-200">
                  {r.type}
                </span>
                {r.orderId ? <span className="ml-2 text-xs text-gray-500">Order {r.orderId.slice(0,8)}</span> : null}
              </td>
              <td className="px-4 py-3">{r.note || ""}</td>
              <td className={"px-4 py-3 text-right font-semibold " + color(r.type)}>
                {sign(r.type)}{Math.abs(r.pointsDelta).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
        <div className="mt-6 lg:col-span-2">
            <h4 className="text-sm font-semibold text-gray-900">History</h4>
        <div className="mt-2">
            <RewardsHistory />
        </div>
       </table>
    </div>
  );
}
