import "server-only";

import Link from "next/link";
import { Suspense } from "react";
import NotFoundClient from "./NotFoundClient";

export const dynamic = "force-static";

// ✅ If you currently have themeColor in metadata, Next 15 wants it in viewport.
export const viewport = {
  themeColor: "#0f172a",
};

export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-3 text-slate-700">
        That page doesn’t exist or may have moved.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Go home
        </Link>

        <Link
          href="/categories"
          className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900"
        >
          Browse categories
        </Link>
      </div>

      {/* ✅ This is the key: any useSearchParams MUST be under Suspense */}
      <Suspense fallback={null}>
        <Suspense fallback={null}><NotFoundClient /></Suspense>
      </Suspense>
    </main>
  );
}
