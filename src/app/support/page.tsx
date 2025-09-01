import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support Center | ADAP",
  description:
    "We’re here for you. Find articles, help, and advice for getting the most out of ADAP. Artwork prep, orders, shipping, payments, and more.",
};

type Article = { title: string; id: string; href?: string };
type Category = { title: string; id: string; articles: Article[] };

const CATS: Category[] = [
  {
    title: "Account",
    id: "account",
    articles: [
      { title: "Changing Your Email Address", id: "account-change-email" },
      { title: "Update Default Billing / Shipping Address", id: "account-default-address" },
      { title: "Change Your Password", id: "account-change-password" },
      { title: "Add An Additional Address", id: "account-add-address" },
    ],
  },
  {
    title: "Artwork Preparation",
    id: "artwork-preparation",
    articles: [
      { title: "Setup Guides and Templates", id: "artwork-guides", href: "/guides" },
      { title: "How to Use Our Proofing System", id: "artwork-proofing" },
      { title: "Types of Black (Rich vs. 100K)", id: "artwork-black" },
      { title: "Saving & Exporting Print-Ready Files", id: "artwork-export" },
    ],
  },
  {
    title: "General",
    id: "general",
    articles: [
      { title: "Prices, Quotes and Estimates", id: "general-quotes", href: "/quotes" },
      { title: "Turnaround & Production Times", id: "general-turnaround", href: "/turnaround" },
      { title: "How to Get Pricing & Quotes", id: "general-how-pricing", href: "/quotes" },
      { title: "Who Can Use ADAP?", id: "general-who" },
    ],
  },
  {
    title: "Payments",
    id: "payments",
    articles: [
      { title: "Accepted Methods of Payment", id: "payments-methods" },
      { title: "Invoices & Receipts", id: "payments-invoices" },
      { title: "Store Credit & Refunds", id: "payments-credit" },
      { title: "Checking Refund Status", id: "payments-refund-status" },
    ],
  },
  {
    title: "Placing Your Order",
    id: "placing-order",
    articles: [
      { title: "Using Our Proofing System", id: "placing-proofing" },
      { title: "Folding & Cracking (What to Expect)", id: "placing-folding-cracking" },
      { title: "Checking Your Order Status", id: "placing-status" },
      { title: "Submitting a Custom Order", id: "placing-custom-order", href: "/quotes" },
    ],
  },
  {
    title: "Shipping / Delivery",
    id: "shipping-delivery",
    articles: [
      { title: "Blind Shipping & Drop Shipping", id: "shipping-blind" },
      { title: "Shipping Methods", id: "shipping-methods", href: "/shipping" },
      { title: "Shipping Locations", id: "shipping-locations" },
      { title: "Separately Shipping Items in a Cart", id: "shipping-split" },
    ],
  },
];

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-2 inline-flex items-center rounded-md border border-slate-300 px-1.5 py-0.5 text-xs text-slate-700">
      {children}
    </span>
  );
}

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <p className="text-center text-xs text-slate-500">
          Customer Service Hours Monday to Friday 8 AM to 5 PM Eastern Time
        </p>
        <h1 className="mt-3 text-center text-3xl font-extrabold tracking-tight text-slate-900">
          Support Center
        </h1>
        <p className="mt-2 text-center text-slate-600">
          We’re here for you. Find articles, help, and advice for getting the most out of ADAP.
          Setup flows match the{" "}
          <strong>SinaLite API documentation</strong> specs we use in production.
        </p>
      </section>

      {/* Top Articles */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">Top Articles</h2>
        <div className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {CATS.map((cat) => (
            <div key={cat.id}>
              <h3 className="text-lg font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4">
                <Link href={`#${cat.id}`}>{cat.title}</Link>
              </h3>
              <ul className="mt-2 space-y-1">
                {cat.articles.slice(0, 4).map((a) => {
                  const href = a.href ?? `#${a.id}`;
                  return (
                    <li key={a.id}>
                      <Link
                        href={href}
                        className="text-blue-700 underline-offset-2 hover:underline"
                      >
                        {a.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2">
                <Link
                  href={`#${cat.id}`}
                  className="text-sm text-slate-600 underline-offset-2 hover:underline"
                >
                  View All
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-6 flex justify-center">
          <Link
            href="/contact"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow hover:bg-blue-700"
          >
            Create a Ticket
          </Link>
        </div>
      </section>

      {/* All Topics (accordion-style via <details>) */}
      <section className="mt-8 space-y-4">
        {CATS.map((cat) => (
          <details
            key={cat.id}
            id={cat.id}
            className="group rounded-lg border border-slate-300 bg-white"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 hover:bg-slate-50">
              <span className="font-semibold text-slate-900">{cat.title}</span>
              <svg
                className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </summary>

            <div className="border-t border-slate-200 px-4 py-3">
              <ul className="ml-5 list-disc space-y-1">
                {cat.articles.map((a) => {
                  const href = a.href ?? `#${a.id}`;
                  return (
                    <li key={a.id} className="text-slate-700">
                      <Link
                        href={href}
                        className="text-blue-700 underline-offset-2 hover:underline"
                      >
                        {a.title}
                      </Link>
                      <Badge>Article</Badge>
                    </li>
                  );
                })}
              </ul>

              {/* On-page anchors for “today only” targets */}
              <div className="sr-only" aria-hidden>
                {cat.articles.map((a) => (
                  <div key={`${a.id}-anchor`} id={a.id} />
                ))}
              </div>
            </div>
          </details>
        ))}
      </section>

      <footer className="mt-8 rounded-xl border border-slate-200 bg-white p-4 text-center text-xs text-slate-500">
        Powered by Cloudflare CDN for fast delivery.
      </footer>
    </main>
  );
}
