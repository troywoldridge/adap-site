import "server-only";

import Link from "next/link";
import { Suspense } from "react";
import NotFoundClient from "@/components/not-found/NotFoundClient";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-3 text-slate-700">
        The page you’re looking for doesn’t exist or may have moved.
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

      {/* ✅ Any useSearchParams must be in a client component wrapped in Suspense */}
      <Suspense fallback={null}>
        <NotFoundClient />
      </Suspense>
    </main>
  );
}
