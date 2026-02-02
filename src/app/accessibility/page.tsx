import "server-only";

import type { Metadata, Viewport } from "next";
import Link from "next/link";

export const viewport: Viewport = {
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Accessibility | ADAP",
  description:
    "ADAP is committed to digital accessibility. Learn about our WCAG conformance, compatibility, feedback options, and ongoing improvements.",
};

const updated = new Date().toISOString().slice(0, 10);

export default function AccessibilityPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="rounded-2xl border bg-white p-6">
        <h1 className="text-3xl font-extrabold">Accessibility Statement</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: {updated}</p>
      </header>

      <section className="mt-8 space-y-6 bg-white p-6 rounded-2xl border">
        <p>
          Our goal is conformance with <strong>WCAG 2.1 Level AA</strong>.
        </p>
        <Link href="/contact" className="text-blue-700 underline">
          Contact Us
        </Link>
      </section>
    </main>
  );
}
