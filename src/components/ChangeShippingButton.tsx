"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ChangeShippingButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const res = await fetch("/api/cart/clear-shipping", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      // optional: toast
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="mt-2 inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-gray-100 px-3 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:opacity-50"
    >
      {busy ? "Updating…" : "Change"}
    </button>
  );
}
