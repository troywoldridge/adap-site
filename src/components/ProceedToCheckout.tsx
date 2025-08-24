// src/components/ProceedToCheckout.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";

type Props = {
  ensureAdded?: () => Promise<void> | void;
  to?: "/cart" | "/cart/review" | "/checkout";
  className?: string;
  children?: React.ReactNode;
};

export default function ProceedToCheckout({
  ensureAdded,
  to = "/cart/review",
  className,
  children,
}: Props) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    try {
      setBusy(true);
      if (ensureAdded) await ensureAdded();

      // Gate: if not signed in, go through Clerk sign-in page
      if (!isSignedIn) {
        // Clerk v6+ uses redirect_url query param on the Sign-in route
        const redirect = encodeURIComponent(to);
        router.push(`/sign-in?redirect_url=${redirect}`);
        return;
      }

      router.push(to);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={className ?? "btn btn--primary w-full"}
    >
      {busy ? "One moment…" : children ?? "Checkout"}
    </button>
  );
}
