// src/app/turnaround/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Turnaround Options | ADAP",
  description:
    "Realistic, published production schedules. Choose the speed that fits your deadline.",
};

const WINDOWS = [
  { label: "Next Business Day", cutoff: "Cut-off 1:00 PM EST" },
  { label: "2 – 3 Business Days", cutoff: "Cut-off 1:00 PM EST" },
  { label: "3 – 4 Business Days", cutoff: "Cut-off 1:00 PM EST" },
  { label: "5 – 7 Business Days", cutoff: "Cut-off 1:00 PM EST" },
];

export default function TurnaroundPage() {
  return (
    <main className="px-4 py-10">
      {/* Top note */}
      <section className="mx-auto max-w-6xl rounded-2xl border border-teal-200 bg-teal-50 p-6">
        <h1 className="text-2xl font-bold text-teal-900">Turnaround Options</h1>
        <p className="mt-2 text-teal-900/80">
          We quote realistic ship windows based on press capacity and file
          readiness. Provide press-ready art (see{" "}
          <a className="font-semibold underline" href="/guides">
            Artwork Setup Guides
          </a>
          ) to avoid delays. Turnaround begins after payment + proof approval (if
          applicable).
        </p>
      </section>

      {/* Timeline blocks */}
      <section className="mx-auto mt-8 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2">
        {WINDOWS.map((w) => (
          <div
            key={w.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{w.label}</h2>
              <div className="text-xs text-slate-500">{w.cutoff}</div>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                <div
                  key={d}
                  className={[
                    "rounded-md border px-2 py-2",
                    i === 0 ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50",
                  ].join(" ")}
                >
                  {d}
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Production days exclude weekends/holidays. Shipping time is in
              addition to production and depends on the selected carrier.
            </p>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-8 max-w-6xl rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
        <p>
          Need guidance on which speed fits your event date?{" "}
          <a href="/support" className="font-semibold text-blue-700 underline">
            Chat with an expert
          </a>
          . We follow the latest <strong>SinaLite API</strong> spec for product
          options and production rules, so your ETA matches real press time.
        </p>
      </section>
    </main>
  );
}
