// src/app/guarantees/page.tsx
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Our Guarantees | ADAP",
  description:
    "Premium print quality, on-time delivery, and support you can count on. See what we guarantee on every order.",
};

const CF = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH ?? "";
// Optional: set your own image IDs in env; fall back to local
const HERO_ID = process.env.NEXT_PUBLIC_CF_GUARANTEES_HERO_ID ?? "";
const HERO_URL = HERO_ID && CF
  ? `https://imagedelivery.net/${CF}/${HERO_ID}/public`
  : "/images/guarantees-hero.jpg";

export default function GuaranteesPage() {
  return (
    <main className="px-4 py-10">
      {/* Hero */}
      <section className="mx-auto max-w-6xl overflow-hidden rounded-2xl bg-blue-600 text-white shadow">
        <div className="grid grid-cols-1 gap-6 p-8 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Our Guarantees
            </h1>
            <p className="mt-2 text-blue-100">
              We follow the <strong>SinaLite API</strong> print specs and file-prep
              requirements, then produce on top-tier equipment—so your work looks
              exactly as it should. Every time.
            </p>
          </div>
          <div className="relative aspect-[16/9] w-full md:aspect-[5/3]">
            <Image
              src={HERO_URL}
              alt="100% satisfaction badge"
              fill
              className="object-cover"
              priority
              unoptimized
            />
          </div>
        </div>
      </section>

      {/* Two primary guarantees */}
      <section className="mx-auto mt-8 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            100% Quality Confidence
          </h2>
          <p className="mt-2 text-slate-600">
            If a print defect slips through, we’ll make it right with a
            reprint, credit, or refund—fast. Our workflow adheres to the{" "}
            <strong>SinaLite file setup guidelines</strong> (bleeds, resolution,
            color modes) and we verify common issues before production.
          </p>
          <ul className="mt-3 list-inside list-disc text-slate-600">
            <li>Professional color management and calibrated devices</li>
            <li>Automated preflight checks against spec</li>
            <li>Real humans watching your order through final QC</li>
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            On-Time Delivery Promise
          </h2>
          <p className="mt-2 text-slate-600">
            We publish realistic turnarounds (see{" "}
            <a className="text-blue-700 underline" href="/turnaround">
              Turnaround Options
            </a>
            ) and ship with major carriers. If we miss the quoted ship window due
            to our own process, we’ll make it right.
          </p>
          <ul className="mt-3 list-inside list-disc text-slate-600">
            <li>Clear ship-by dates shown before checkout</li>
            <li>Live tracking + proactive status updates</li>
            <li>Blind shipping available—your brand on the box</li>
          </ul>
        </article>
      </section>

      {/* Extra reassurance */}
      <section className="mx-auto mt-8 max-w-6xl rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm text-emerald-900">
          Heads-up: some timelines depend on proof approval and carrier
          conditions. Provide press-ready files that follow the{" "}
          <a className="font-semibold underline" href="/guides">
            Artwork Setup Guides
          </a>{" "}
          for the smoothest path to print.
        </p>
      </section>
    </main>
  );
}
