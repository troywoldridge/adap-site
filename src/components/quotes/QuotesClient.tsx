"use client";

import { useState } from "react";
import Link from "next/link";

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-md px-4 py-2 text-sm font-semibold transition",
        active
          ? "bg-blue-600 text-white shadow"
          : "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function QuotesClient() {
  const [tab, setTab] = useState<"quote" | "custom">("quote");

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Hero / intro */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <h1 className="text-2xl font-bold text-slate-900">Custom Quotes & Orders</h1>
        <p className="mt-2 text-slate-600">
          Tell us what you need and we’ll price it fast. We follow the{" "}
          <strong>SinaLite API documentation</strong> product specs to make sure your
          quote matches production exactly.
        </p>

        {/* Tabs */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <TabButton active={tab === "quote"} onClick={() => setTab("quote")}>
            Quote Request Form
          </TabButton>
          <TabButton active={tab === "custom"} onClick={() => setTab("custom")}>
            Custom Order Submission
          </TabButton>
        </div>

        {/* Panels */}
        <div className="mt-6">
          {tab === "quote" ? <QuoteForm /> : <CustomOrderForm />}
        </div>

        {/* Helpful links */}
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
          <span className="font-semibold">Helpful:</span>
          <Link className="underline underline-offset-4 hover:text-blue-700" href="/guides">
            Artwork Setup Guides (PDF)
          </Link>
          <span className="opacity-50">|</span>
          <Link className="underline underline-offset-4 hover:text-blue-700" href="/shipping">
            Shipping Options
          </Link>
          <span className="opacity-50">|</span>
          <Link className="underline underline-offset-4 hover:text-blue-700" href="/turnaround">
            Turnaround Times
          </Link>
          <span className="opacity-50">|</span>
          <Link className="underline underline-offset-4 hover:text-blue-700" href="/guarantees">
            Our Guarantees
          </Link>
        </div>
      </section>
    </main>
  );
}

/* ----------------------------- Quote Request ----------------------------- */

function QuoteForm() {
  return (
    <form
      className="grid grid-cols-1 gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        alert("Thanks! We’ll email your quote details shortly.");
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Text name="name" label="Name *" required />
        <Text name="company" label="Company" />
        <Text name="email" label="Email *" type="email" required />
        <Text name="phone" label="Phone" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          name="productType"
          label="Type of Product *"
          required
          options={[
            "Business Cards",
            "Postcards",
            "Brochures",
            "Large Format Posters",
            "Vinyl Banners",
            "Table Covers",
            "Labels & Packaging",
            "Apparel",
            "Other",
          ]}
        />
        <Text name="size" label="Size" placeholder='e.g. "24 × 36" or "3.5 × 2"' />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          name="colors"
          label="Colors"
          options={["1 sided CMYK", "2 sided CMYK", "Spot + CMYK", "Black only"]}
        />
        <Text name="material" label="Stock / Material" placeholder="e.g. 16pt C2S, 13oz Vinyl" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Text name="finishing" label="Coating / Finishing Requirements" placeholder="e.g. Matte, Gloss, UV, Grommets" />
        <Text name="quantity" label="Quantity" inputMode="numeric" />
      </div>

      <TextArea
        name="notes"
        label="Project Notes"
        placeholder="Tell us anything important for pricing & production."
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Quotes typically returned in 1–2 business days (per SinaLite production guidance).
        </p>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow hover:bg-blue-700"
        >
          Request Quote
        </button>
      </div>
    </form>
  );
}

/* -------------------------- Custom Order Submission -------------------------- */

function CustomOrderForm() {
  return (
    <form
      className="grid grid-cols-1 gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        alert("Custom order submitted! We’ll confirm the details by email.");
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Text name="company" label="Company Name *" required />
        <Text name="email" label="Email *" type="email" required />
        <Text name="phone" label="Phone *" required />
        <Text name="quoteNumber" label="Quote Number *" required placeholder="From your approved quote" />
      </div>

      <Text name="po" label="PO (optional)" />

      <TextArea
        name="instructions"
        label="Additional Notes"
        placeholder="Provide any special instructions for production."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Text name="expectedDate" label="Expected Date" placeholder="YYYY-MM-DD" />
        <Select
          name="shippingOption"
          label="Shipping Option"
          options={["Ship for me", "Blind ship to client", "Local pickup"]}
        />
      </div>

      {/* Simple file input; your R2 artwork uploader can be linked here if desired */}
      <div>
        <label className="block text-sm font-semibold text-slate-800">Upload Artwork</label>
        <input
          type="file"
          className="mt-1 block w-full cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-700"
          aria-label="Upload artwork"
        />
        <p className="mt-1 text-xs text-slate-500">
          We validate files based on SinaLite’s prepress guidance to keep production smooth.
        </p>
      </div>

      <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
        <strong>Heads up:</strong> Custom jobs can vary based on artwork approval and finishing.
        If your timeline is tight, mention the hard deadline above and we’ll advise options.
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Files are handled over Cloudflare CDN; production runs per the SinaLite API specs.
        </p>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow hover:bg-blue-700"
        >
          Submit Custom Order
        </button>
      </div>
    </form>
  );
}

/* --------------------------------- Inputs --------------------------------- */

function Text(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }
) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-slate-800">{label}</span>
      <input
        {...rest}
        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </label>
  );
}

function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }
) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-slate-800">{label}</span>
      <textarea
        {...rest}
        rows={4}
        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </label>
  );
}

function Select({
  label,
  options = [],
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options?: string[];
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-slate-800">{label}</span>
      <select
        {...rest}
        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="" />
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
