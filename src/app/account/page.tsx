// src/app/account/page.tsx
import "server-only";
import type { Metadata } from "next";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "Your Account • Orders",
};

export default async function AccountPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-8">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 p-[1px] shadow-lg">
        <div className="rounded-2xl bg-white/95 p-6 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                Your Orders
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Track, reorder, and download your artwork.
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <a
                href="/products"
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                Shop products
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="mt-8">
        <AccountClient />
      </section>
    </main>
  );
}
