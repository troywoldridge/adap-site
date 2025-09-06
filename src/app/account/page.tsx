import "server-only";
import type { Metadata } from "next";

/**
 * Account page (server component)
 * - Purely renders the frame & defers all dynamic bits to AccountClient.
 * - Keep server-only to avoid client bundling; no hooks here.
 */

export const metadata: Metadata = {
  title: "Your Account • ADAP",
  description:
    "Manage orders, track shipments, view loyalty rewards, and maintain your addresses.",
};

export default async function AccountPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-10">
      {/* HERO */}
      <header className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 p-[1px] shadow-2xl">
        <div className="rounded-3xl bg-white/95 p-6 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Your Account
              </h1>
              <p className="max-w-2xl text-sm text-gray-600">
                Track orders and shipments, manage addresses, redeem rewards, and
                update your profile—all in one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/products"
                className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                Shop products
              </a>
              <a
                href="/support"
                className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                Create a support ticket
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT (Client-rendered) */}
      <section className="mt-10">
        {/* We import as a dynamic client file to keep this server component clean */}
        {/* @ts-expect-error - next will inline the client file */}
        {await import("./AccountClient").then((m) => <m.default />)}
      </section>
    </main>
  );
}
