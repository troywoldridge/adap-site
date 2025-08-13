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

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://americandesignandprinting.com";

const DEFAULT_OG = cfUrl(process.env.DEFAULT_SOCIAL_SHARE_IMAGE_ID || null);

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Custom Print Experts | American Design And Printing",
  description:
    "Your one-stop for trade printing—business cards, banners, invitations, and more. Powered by SinaLite. Blazing fast turnaround and amazing support.",
  alternates: { canonical: SITE },
  openGraph: {
    title: "Custom Print Experts | American Design And Printing",
    description:
      "Shop business cards, postcards, signs, and custom print products—delivered with lightning-fast turnaround!",
    url: SITE,
    siteName: "American Design And Printing",
    images: DEFAULT_OG ? [{ url: DEFAULT_OG, width: 1200, height: 630, alt: "American Design And Printing - Premium Print Products" }] : undefined,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Custom Print Experts | American Design And Printing",
    description:
      "Shop premium print & promo with blazing-fast shipping and stellar support.",
    images: DEFAULT_OG ? [DEFAULT_OG] : undefined,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Organization + Website JSON-LD (inline = no extra imports)
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
          target: `${SITE}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          {/* CWV: preconnect to CF Images + SinaLite API */}
          <link rel="preconnect" href="https://imagedelivery.net" crossOrigin="" />
          <link
            rel="preconnect"
            href={process.env.SINALITE_API_BASE || "https://api.sinaliteuppy.com"}
            crossOrigin=""
          />
          <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </head>
        <body>
          {/* 1) Top announcement bar */}
          <NotificationBar />

          {/* 2) Secondary account nav */}
          <TopNav />

          {/* 3) Main header with logo, search, icons */}
          <Header />

          {/* 4) Main nav (categories) */}
          <MainNav />

          {/* 5) Support banner: tickets, call, chat */}
          <SupportBanner />

          {/* 6) Page content */}
          <main>{children}</main>

          {/* 7) Footer */}
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
