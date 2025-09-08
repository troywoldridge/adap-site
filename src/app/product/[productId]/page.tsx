// src/app/page.tsx
import type { Metadata } from "next";
import Hero from "@/components/Hero";
import FeaturedCategories from "@/components/FeaturedCategories";
import { getLocalCategories } from "@/lib/catalogLocal";
import SignupPromoCard from "@/components/SignupPromoCard";
import SalesCards, { type SaleCard } from "@/components/SalesCards";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://adapnow.com";

type LocalCategory = {
  slug: string;
  name: string;
  image?: string | null; // Cloudflare Images URL from your lib
  description?: string | null;
};

// (Optional) If you want a home-specific title/desc that override layout defaults:
export const metadata: Metadata = {
  title: "American Design And Printing | Custom Print Experts",
  description:
    "Grow your print business with trade-only pricing, fast turnaround, 24/7 tracking, and pro support. Powered by SinaLite.",
  alternates: { canonical: "/" },
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

  /* ---------------- JSON-LD: ItemList (Featured Categories) ---------------- */
  const categoriesLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: featured.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      url: `${SITE}${c.href}`,
      image: c.imageUrl || undefined,
    })),
  };

  /* ---------------- JSON-LD: ItemList (Promoted Products) ------------------ */
  const promosLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: promos.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.name,
        url: `${SITE}${p.href}`,
        image: p.imageUrl,
        // price/offers come from live SinaLite flows on the product page
      },
    })),
  };

  /* ---------------- JSON-LD: FAQPage (Home) --------------------------------
     Built from your “Why choose ADAP?” + “Our promise” copy so it matches on-page content.
  --------------------------------------------------------------------------- */
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How does ADAP help me make more money?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "We offer low trade-only pricing powered by SinaLite so you keep more margin while delivering premium quality.",
        },
      },
      {
        "@type": "Question",
        name: "Can ADAP cover all my clients’ printing needs?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes — become a one-stop shop with a wide range of print, large format, and more, all fulfilled to spec.",
        },
      },
      {
        "@type": "Question",
        name: "How fast is turnaround?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Fast! Live ETAs show during pricing and checkout. Turnaround depends on options and quantity.",
        },
      },
      {
        "@type": "Question",
        name: "Do you deliver across the USA?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. Our promise is on-time delivery anywhere in the USA with reliable carriers.",
        },
      },
      {
        "@type": "Question",
        name: "Is there real-time order tracking?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Absolutely — you get 24/7 live tracking from production through delivery.",
        },
      },
      {
        "@type": "Question",
        name: "Are there any hidden costs?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "No hidden costs, no delays, and no paperwork — transparent pricing at checkout.",
        },
      },
    ],
  };

  return (
    <main>
      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categoriesLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(promosLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      {/* Floating “sign up & save” card for signed-out users */}
      <SignupPromoCard />

      {/* Hero */}
      <Hero />

      {/* Sales Card */}
      <SalesCards items={promos} />

      {/* Featured Category Cards */}
      <section className="pt-10">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-xl font-semibold text-slate-900 mb-6">
            Shop by Category
          </h2>
          <FeaturedCategories categories={featured} limit={3} />
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
                  <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" />
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
              <span aria-hidden className="text-green-700 mr-2">✔</span>
              <p>On time delivery anywhere in USA</p>
            </div>
            <div className="flex items-center">
              <span aria-hidden className="text-green-700 mr-2">✔</span>
              <p>No hidden costs, no delays, &amp; no paperwork</p>
            </div>
            <div className="flex items-center">
              <span aria-hidden className="text-green-700 mr-2">✔</span>
              <p>24/7 live order tracking</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
