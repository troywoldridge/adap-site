// src/app/not-found.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found • ADAP",
  description: "We couldn’t find that page.",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)",  color: "#0b1220" },
  ],
};

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-neutral-600">Let’s get you back on track.</p>
    </main>
  );
}
