import { Suspense } from "react";
import CheckoutCompleteClient from "./CompleteClient";

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export const dynamic = "force-dynamic";

export default function CheckoutCompletePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-600">Loading…</div>}>
      <CheckoutCompleteClient />
    </Suspense>
  );
}
