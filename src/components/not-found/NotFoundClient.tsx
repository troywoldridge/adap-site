"use client";

import { useSearchParams } from "next/navigation";

export default function NotFoundClient() {
  const sp = useSearchParams();

  // Optional: show a subtle ref value if present (keeps behavior minimal)
  const from = sp.get("from") || "";
  if (!from) return null;

  return (
    <p className="mt-6 text-sm text-slate-500">
      Referrer: <span className="font-mono">{from}</span>
    </p>
  );
}
