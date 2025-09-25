// src/app/cart/review/RemoveLineButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RemoveLineButton({
  lineId,
  className = "",
}: {
  lineId: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onRemove() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/cart/lines/${encodeURIComponent(lineId)}`, {
        method: "DELETE",
        headers: { accept: "application/json" },
        cache: "no-store",
      });
    } catch {
      // ignore errors; we'll still refresh to reflect state
    } finally {
      setBusy(false);
      router.refresh(); // re-run server loader on /cart/review
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onRemove}
      className={`inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-600/50 disabled:opacity-50 ${className}`}
      aria-label="Remove item"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path
          fillRule="evenodd"
          d="M10 8.586 4.95 3.536a1 1 0 1 0-1.414 1.414L8.586 10l-5.05 5.05a1 1 0 0 0 1.414 1.414L10 11.414l5.05 5.05a1 1 0 0 0 1.414-1.414L11.414 10l5.05-5.05A1 1 0 1 0 15.05 3.536L10 8.586Z"
          clipRule="evenodd"
        />
      </svg>
      {busy ? "Removing…" : "Remove"}
    </button>
  );
}
