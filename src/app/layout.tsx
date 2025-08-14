// src/app/layout.tsx
import "./globals.css";
import NotificationBar from "@/components/NotificationBar";
import TopNav from "@/components/TopNav";
import Header from "@/components/Header";
import MainNav from "@/components/MainNav";
import SupportBanner from "@/components/SupportBanner";
import Footer from "@/components/Footer";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { cfUrl } from "@/lib/data";
import "instantsearch.css/themes/satellite.css";
import "@algolia/autocomplete-theme-classic/dist/theme.css";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://americandesignandprinting.com";

const DEFAULT_OG = cfUrl(process.env.DEFAULT_SOCIAL_SHARE_IMAGE_ID || null);

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Custom Print Experts | American Design And Printing",
  description:
    "Your one-stop for trade printing—business cards, banners, invitations, and more. Powered by SinaLite.",
  alternates: { canonical: SITE },
  openGraph: {
    title: "Custom Print Experts | American Design And Printing",
    description: "Shop business cards, postcards, signs, and custom print products—delivered fast!",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey && process.env.NODE_ENV !== "production") {
    console.warn("⚠️ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing");
  }

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE}#org`,
        name: "American Design And Printing",
        url: SITE,
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
          {/* Preconnect: Cloudflare Images + SinaLite (per docs) */}
          <link rel="preconnect" href="https://imagedelivery.net" crossOrigin="" />
          <link
            rel="preconnect"
            href={process.env.SINALITE_API_BASE || "https://api.sinaliteuppy.com"}
            crossOrigin=""
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </head>
        <body>
          <NotificationBar />
          <TopNav />
          <Header />
          <MainNav />
          <SupportBanner />
          <main>{children}</main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
