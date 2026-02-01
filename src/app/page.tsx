// src/app/page.tsx
import "server-only";

import { Suspense } from "react";

import Hero from "@/components/Hero";
import FeaturedCategories from "@/components/FeaturedCategories";
import { getLocalCategories } from "@/lib/catalogLocal";
import SalesCards, { type SaleCard } from "@/components/SalesCards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Minimal shape to satisfy TypeScript
type LocalCategory = {
  slug: string;
  name: string;
  image?: string | null; // should already be a Cloudflare Images URL from your lib
  description?: string | null;
};

export default async function HomePage() {
  // ✅ supports sync or async getLocalCategories()
  const categories = (await Promise.resolve(
    getLocalCategories()
  )) as LocalCategory[];

  const featuredSlugs = ["business-cards", "large-format", "print-products"];
  const featured = featuredSlugs
    .map((slug) => categories.find((c) => c.slug === slug) || null)
    .filter((c): c is LocalCategory => !!c)
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      imageUrl: c.image ?? "",
      href: `/categories/${c.slug}`,
      description: c.description ?? undefined,
    }));

  const promos: SaleCard[] = [
    {
      id: "foam-board",
      name: "Foam Board",
      href: "/products/foam-board",
      imageUrl:
        "https://imagedelivery.net/pJ0fKvjCAbyoF8aD0BGu8Q/e02bbfd1-7096-4c3b-9c50-61b5a7d26100/saleCard",
      discountLabel: "10% OFF",
    },
    {
      id: "door-hangers",
      name: "Door Hangers",
      href: "/products/door-hangers",
      imageUrl:
        "https://imagedelivery.net/pJ0fKvjCAbyoF8aD0BGu8Q/49701951-43d8-4abc-5dcc-2101ef4cdd00/saleCard",
      discountLabel: "10% OFF",
    },
    {
      id: "soft-touch-bc",
      name: "Soft Touch Business Cards",
      href: "/products/soft-touch-business-cards",
      imageUrl:
        "https://imagedelivery.net/pJ0fKvjCAbyoF8aD0BGu8Q/0053681e-2792-4571-ef75-b844fd438400/saleCard",
      discountLabel: "10% OFF",
    },
  ];

  return (
    <main>
      {/* Hero */}
      <Suspense
        fallback={
          <div
            className="mx-auto max-w-7xl px-4 py-10"
            aria-label="Loading hero"
          >
            <div className="h-[280px] rounded-2xl bg-gray-100 animate-pulse" />
          </div>
        }
      >
        <Hero />
      </Suspense>

      {/* Sales Cards */}
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 pt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-40 rounded-xl bg-gray-100 animate-pulse"
                />
              ))}
            </div>
          </div>
        }
      >
        <SalesCards items={promos} />
      </Suspense>

      {/* Featured Category Cards */}
      <section className="pt-10">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-xl font-semibold text-slate-900 mb-6">
            Shop by Category
          </h2>

          <Suspense
            fallback={
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-56 rounded-xl bg-gray-100 animate-pulse"
                  />
                ))}
              </div>
            }
          >
            <FeaturedCategories categories={featured} limit={3} />
          </Suspense>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="pt-14">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-xl font-semibold text-slate-900 mb-6">
            Why choose ADAP?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-800">
            <div className="flex items-center">
              <span aria-hidden className="shrink-0 text-blue-700">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 13a6 6 0 016-6h4a5 5 0 015 5v2h-2l-1.5 3H7l-1-2H3v-2z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <circle cx="9.5" cy="8" r="1" fill="currentColor" />
                </svg>
              </span>
              <p className="ml-3">Make more money with low trade pricing</p>
            </div>

            <div className="flex items-center">
              <span aria-hidden className="shrink-0 text-blue-700">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="8"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M9 13l-3 8 6-3 6 3-3-8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    fill="none"
                  />
                </svg>
              </span>
              <p className="ml-3">
                Become a one-stop shop for your clients’ printing needs
              </p>
            </div>

            <div className="flex items-center">
              <span aria-hidden className="shrink-0 text-blue-700">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M12 7v5l3 2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                </svg>
              </span>
              <p className="ml-3">
                Get repeat orders by delivering high-quality products on time
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Promise */}
      <section className="pt-12 pb-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-xl font-semibold text-slate-900 mb-6">
            Our promise to you:
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-800">
            <div className="flex items-center">
              <span aria-hidden className="text-green-700 mr-2">
                ✔
              </span>
              <p>On time delivery anywhere in USA</p>
            </div>

            <div className="flex items-center">
              <span aria-hidden className="text-green-700 mr-2">
                ✔
              </span>
              <p>No hidden costs, no delays, &amp; no paperwork</p>
            </div>

            <div className="flex items-center">
              <span aria-hidden className="text-green-700 mr-2">
                ✔
              </span>
              <p>24/7 live order tracking</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
