// src/app/shipping/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Options | ADAP",
  description:
    "Fast, reliable shipping via UPS and FedEx. Blind shipments, tracking, and packaging that keeps your brand front and center.",
};

export default function ShippingPage() {
  return (
    <main className="px-4 py-10">
      {/* Intro */}
      <section className="mx-auto max-w-6xl rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
        <h1 className="text-2xl font-bold text-indigo-900">Shipping Made Easy</h1>
        <p className="mt-2 text-indigo-900/80">
          We partner with the largest carriers in North America to deliver your
          prints fast—safely and discreetly. Orders ship blind by default (no
          ADAP or SinaLite branding on the label).
        </p>
      </section>

      {/* Carriers */}
      <section className="mx-auto mt-8 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            United Parcel Service (UPS)
          </h2>
          <div className="mt-2 space-y-2 text-sm text-slate-700">
            <div>
              <span className="font-medium">Standard:</span> economical,
              typical 1–2 business days to nearby metros.
            </div>
            <div>
              <span className="font-medium">2-Day / Expedited:</span> 2 business
              days to most U.S. addresses; delivery time guaranteed by UPS.
            </div>
            <div>
              <span className="font-medium">Express Saver:</span> 1 business day,
              often by 12 PM to major metro areas.
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">FedEx</h2>
          <div className="mt-2 space-y-2 text-sm text-slate-700">
            <div>
              <span className="font-medium">Ground:</span> 2–7 business days
              depending on distance; business delivery by 4:30 PM.
            </div>
            <div>
              <span className="font-medium">Economy (2-Day):</span> 2 business
              days by 4:30 PM (business) / 8 PM (residential).
            </div>
            <div>
              <span className="font-medium">Priority:</span> next business day
              by 10 AM to most U.S. destinations.
            </div>
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="mx-auto mt-8 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
        {[
          {
            title: "Blind Shipping",
            desc: "Your clients see your brand—not ours. Packing slips and labels are neutral.",
          },
          {
            title: "Live Tracking",
            desc: "Every shipment includes a tracking link. Share it with your customer in a click.",
          },
          {
            title: "Smart Packaging",
            desc: "Prints are protected for transit so they arrive crisp and client-ready.",
          },
        ].map((b) => (
          <div
            key={b.title}
            className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm"
          >
            <h3 className="font-semibold text-slate-900">{b.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{b.desc}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="mx-auto mt-8 max-w-6xl rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Questions about carriers, PO boxes, or international?{" "}
        <a className="font-semibold underline" href="/support">
          Contact support
        </a>{" "}
        and we’ll recommend the best option for your timeline and destination.
      </section>
    </main>
  );
}

