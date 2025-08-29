// src/components/StripeRedirector.tsx
"use client";

import { useEffect, useState } from "react";

export default function StripeRedirector() {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/checkout/start", { method: "POST", cache: "no-store" });
        const ct = res.headers.get("content-type") || "";
        const data = ct.includes("application/json") ? await res.json() : { ok: false, error: await res.text() };
        if (!res.ok || !data?.ok || !data?.url) throw new Error(data?.error || `HTTP ${res.status}`);
        window.location.assign(data.url as string);
      } catch (e: any) {
        setErr(e?.message || "Failed to start checkout");
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  if (err) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {err}
        <div className="mt-3 flex gap-2">
          <a
            href="/cart/review"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-gray-100 px-3 text-sm font-semibold text-gray-900 hover:bg-gray-200"
          >
            Back to review
          </a>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-10 animate-pulse rounded-md bg-neutral-100" aria-busy={busy} />
  );
}
