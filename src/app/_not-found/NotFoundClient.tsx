"use client";

import { useSearchParams } from "next/navigation";

export default function NotFoundClient() {
  const sp = useSearchParams();

  // If you don't need params, you can delete this entire file later.
  // Keeping it minimal and harmless.
  const from = sp.get("from");
  if (!from) return null;

  return (
    <p className="mt-6 text-sm text-slate-500">
      Referrer: <span className="font-mono">{from}</span>
    </p>
  );
}
