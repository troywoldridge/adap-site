"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type CheckoutShipping = {
  carrier: string;
  method: string;
  cost: number;
  days: number | null;
  currency: "USD" | "CAD";
  country: "US" | "CA";
  state: string;
  zip: string;
} | null;

type Props = {
  /** If the add-to-cart flow must finish first */
  ensureAdded?: () => Promise<void> | void;
  /** Selected rate from the estimator (optional but recommended) */
  shipping?: CheckoutShipping;
  className?: string;
  children?: React.ReactNode;
};

export default function ProceedToCheckout({
  ensureAdded,
  shipping = null,
  className,
  children,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    try {
      setBusy(true);
      if (ensureAdded) await ensureAdded();

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shipping }),
      });

      // Not signed in? middleware returns 401 → send to sign-in and return to review.
      if (res.status === 401) {
        router.push(`/sign-in?redirect_url=${encodeURIComponent("/cart/review")}`);
        return;
      }

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok || !json?.ok || !json?.url) {
        throw new Error(json?.error || `Failed to start checkout`);
      }

      window.location.href = json.url as string;
    } catch (e: any) {
      alert(e?.message || "Could not start checkout");
      setBusy(false);
    }
      }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={className ?? "btn primary w-full"}
    >
      {busy ? "One moment…" : children ?? "Checkout"}
    </button>
    
  );
}
