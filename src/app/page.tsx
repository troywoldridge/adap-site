import "server-only";

import { Suspense } from "react";

import Hero from "@/components/Hero";
import FeaturedCategories from "@/components/FeaturedCategories";
import { getLocalCategories } from "@/lib/catalogLocal";
import SignupPromoCard from "@/components/SignupPromoCard";
import SalesCards, { type SaleCard } from "@/components/SalesCards";
import HomeShellClient from "./HomeShellClient";

type LocalCategory = {
  slug: string;
  name: string;
  image?: string | null;
  description?: string | null;
};

export const viewport = {
  themeColor: "#0f172a",
};

export default function HomePage() {
  const categories = getLocalCategories() as LocalCategory[];

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
    <HomeShellClient>
      <main>
        <Suspense fallback={<div className="sr-only">Loading promo…</div>}>
          <SignupPromoCard />
        </Suspense>

        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-10">
              <div className="h-[280px] rounded-2xl bg-gray-100 animate-pulse" />
            </div>
          }
        >
          <Hero />
        </Suspense>

        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 pt-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-40 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            </div>
          }
        >
          <SalesCards items={promos} />
        </Suspense>

        <section className="pt-10">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="text-center text-xl font-semibold text-slate-900 mb-6">
              Shop by Category
            </h2>
            <Suspense fallback={<div className="h-56 bg-gray-100 animate-pulse rounded-xl" />}>
              <FeaturedCategories categories={featured} limit={3} />
            </Suspense>
          </div>
        </section>
      </main>
    </HomeShellClient>
  );
}
