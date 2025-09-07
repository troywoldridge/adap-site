// src/app/layout.tsx
import "./globals.css";
import NotificationBar from "@/components/NotificationBar";
import Header from "@/components/Header";
import SupportBanner from "@/components/SupportBanner";
import Footer from "@/components/Footer";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { cfUrl } from "@/lib/data";
import RouteProgress from "@/components/RouteProgress";


// If you want to use your client Navigation, keep these lines and the <Navigation /> below.
// If not, you can remove both import + NAV_ITEMS.
import Navigation, { type NavItem } from "@/client/components/navigation";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://adapnow.com";

// Make DEFAULT_OG safe even if env is missing
const DEFAULT_OG = process.env.DEFAULT_SOCIAL_SHARE_IMAGE_ID
  ? cfUrl(process.env.DEFAULT_SOCIAL_SHARE_IMAGE_ID)
  : undefined;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Custom Print Experts | American Design And Printing",
  description:
    "Your one-stop for trade printing—business cards, banners, invitations, and more. Powered by SinaLite.",
  alternates: { canonical: "/" }, // metadataBase makes this absolute
  openGraph: {
    title: "Custom Print Experts | American Design And Printing",
    description:
      "Shop business cards, postcards, signs, and custom print products—delivered fast!",
    url: SITE,
    siteName: "American Design And Printing",
    images: DEFAULT_OG ? [{ url: DEFAULT_OG, width: 1200, height: 630 }] : undefined,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Custom Print Experts | American Design And Printing",
    description: "Premium print & promo with blazing fast shipping.",
    images: DEFAULT_OG ? [DEFAULT_OG] : undefined,
  },
};

// 👉 optional: main nav items for the client Navigation component
const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", exact: true },
  { href: "/products", label: "Products" },
  { href: "/cart", label: "Cart" },
  { href: "/cart/review", label: "Review" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey && process.env.NODE_ENV !== "production") {
    console.warn("⚠️ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing");
  }

  // JSON-LD graph (Organization + WebSite)
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE}#org`,
        name: "American Design And Printing",
        url: SITE,
        // If you have a real logo image, swap this to your Cloudflare Images logo URL
        logo: DEFAULT_OG || undefined,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE}#website`,
        url: SITE,
        name: "American Design And Printing",
        publisher: { "@id": `${SITE}#org` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE}/search?query={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="en">
        <head>
          {/* Preconnects: Cloudflare Images CDN + SinaLite API */}
          <link rel="preconnect" href="https://imagedelivery.net" />
          <link
            rel="preconnect"
            href={process.env.SINALITE_API_BASE || "https://api.sinaliteuppy.com"}
          />

          {/* External CSS (loaded via <link>, not JS import) */}
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/instantsearch.css@8.5.1/themes/satellite.css"
          />
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/@algolia/autocomplete-theme-classic@1.19.2/dist/theme.min.css"
          />

          {/* Site JSON-LD */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />

          {/* Organization JSON-LD (explicit) */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "American Design And Printing",
                url: process.env.NEXT_PUBLIC_SITE_URL || "https://adapnow.com", // fix: no double .com
                logo:
                  "https://imagedelivery.net/pJ0fKvjCAbyoF8aD0BGu8Q/61efd326-bd63-48a4-75a0-8844a6c44400/public",
              }),
            }}
          />
        </head>

        <body>
          <RouteProgress />
          <NotificationBar />
          <Header />
          <SupportBanner />
          <main>{children}</main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
