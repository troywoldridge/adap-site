"use client";

import { useSearchParams } from "next/navigation";

export default function ConfirmationClient() {
  const sp = useSearchParams();

  const sessionId = sp.get("session_id") || sp.get("sessionId") || "";
  const orderId = sp.get("order_id") || sp.get("orderId") || "";

  if (!sessionId && !orderId) return null;

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Confirmation details</h2>

      <dl className="mt-3 space-y-2 text-sm">
        {orderId ? (
          <div className="flex gap-3">
            <dt className="w-28 text-slate-500">Order ID</dt>
            <dd className="font-mono text-slate-900">{orderId}</dd>
          </div>
        ) : null}

        {sessionId ? (
          <div className="flex gap-3">
            <dt className="w-28 text-slate-500">Session</dt>
            <dd className="font-mono text-slate-900">{sessionId}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
