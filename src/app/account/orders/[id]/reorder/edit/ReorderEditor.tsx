// src/app/account/orders/[id]/reorder/edit/ReorderEditor.tsx
"use client";
import * as React from "react";
import { useRouter } from "next/navigation";

type Line = { productId: number; quantity: number; unitPriceCents?: number | null };
type ReorderResponse =
  | { ok: true; goto?: string }
  | { ok: false; error?: string };

export default function ReorderEditor(props: {
  orderId: string;
  currency: "USD" | "CAD";
  lines: Line[];
}) {
  const router = useRouter();
  const [rows, setRows] = React.useState<Line[]>(props.lines);
  const [saving, setSaving] = React.useState(false);

  const fmt = (cents?: number | null) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: props.currency,
    }).format((Number(cents || 0)) / 100);

  const submit = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/orders/${props.orderId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lines: rows }),
      });

      const data: ReorderResponse = await res.json();
      if (!res.ok || !data.ok) {
        const msg = !res.ok ? `HTTP ${res.status}` : (data as { error?: string }).error || "Failed";
        throw new Error(msg);
      }

      router.push(data.goto ?? "/cart/review");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to reorder";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Reorder — adjust quantities</h1>

      <div className="mt-4 overflow-hidden rounded-2xl border">
        <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                Qty
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                Unit
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="px-4 py-3">Product {r.productId}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    value={r.quantity ?? 0}
                    onChange={(e) => {
                      const q = Math.max(0, Math.floor(Number(e.currentTarget.value || 0)));
                      setRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, quantity: q } : x)));
                    }}
                    className="w-24 rounded-lg border px-2 py-1"
                  />
                </td>
                <td className="px-4 py-3">{fmt(r.unitPriceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => history.back()}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-800 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => void submit()}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add to cart"}
        </button>
      </div>
    </main>
  );
}
