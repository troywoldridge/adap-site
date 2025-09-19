// src/app/account/onboarding/OnboardingClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function OnboardingClient() {
  const sp = useSearchParams(); // ✅ allowed in client component
  const returnTo = useMemo(() => sp.get("returnTo") || "/", [sp]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function completeOnboarding(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // call your API to save profile bits (name/marketing/phone, etc)
      // this endpoint should follow the SinaLite-friendly profile pattern in your app
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ marketingOptIn: true }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Save failed (${res.status})`);
      }
      setDone(true);
      // small delay for UX, then navigate
      setTimeout(() => {
        window.location.href = returnTo || "/";
      }, 600);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Welcome! Let’s finish your setup.</h1>
        <p className="mt-2 text-gray-600">
          This helps us speed up checkout and personalize your experience.
        </p>

        <form onSubmit={completeOnboarding} className="mt-6 space-y-4">
          {/* keep it minimal; expand with your fields later */}
          <div className="flex items-center gap-2">
            <input id="opt" type="checkbox" defaultChecked className="h-4 w-4" />
            <label htmlFor="opt" className="text-sm text-gray-800">
              Yes, send me occasional promos and tips.
            </label>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || done}
            className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {done ? "All set! Redirecting…" : busy ? "Saving…" : "Finish"}
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-500">
          Images are delivered via the Cloudflare CDN; pricing and fulfillment integrate with the
          SinaLite API per their docs. 🚀
        </p>
      </div>
    </main>
  );
}
