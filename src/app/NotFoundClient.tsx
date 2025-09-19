// src/app/NotFoundClient.tsx
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function NotFoundClient() {
  const sp = useSearchParams();
  const from = sp.get("from") || "/";

  return (
    <main className="mx-auto max-w-2xl p-8 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-gray-600">The page you’re looking for doesn’t exist.</p>
      <div className="mt-6">
        <Link href={from} className="text-blue-700 hover:underline">Go back</Link>
      </div>
    </main>
  );
}
