import { Suspense } from "react";
// src/app/layout.tsx
import "./globals.css";
import NotificationBar from "@/components/NotificationBar";

import SupportBanner from "@/components/SupportBanner";
import Footer from "@/components/Footer";
import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { cfUrl } from "@/lib/data";
import HeaderSlot from "@/components/slots/HeaderSlot";
import RouteProgressSlot from "@/components/slots/RouteProgressSlot";

// const NAV_ITEMS if you enable client nav later
// import Navigation, { type NavItem } from "@/client/components/navigation";
export const viewport: Viewport = {
  // one color OR light/dark variants:
  // themeColor: "#0047ab",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://adapnow.com";
const SITE_NAME = "American Design And Printing";

// Social share default image via Cloudflare Images (CDN)
const DEFAULT_OG = process.env.DEFAULT_SOCIAL_SHARE_IMAGE_ID
  ? cfUrl(process.env.DEFAULT_SOCIAL_SHARE_IMAGE_ID)
  : undefined;

// Optional social/link + support envs (add the ones you have)
const SOCIALS = [
  process.env.NEXT_PUBLIC_TWITTER_URL,
  process.env.NEXT_PUBLIC_FACEBOOK_URL,
  process.env.NEXT_PUBLIC_INSTAGRAM_URL,
  process.env.NEXT_PUBLIC_LINKEDIN_URL,
  process.env.NEXT_PUBLIC_YOUTUBE_URL,
].filter(Boolean) as string[];

const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "";
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  applicationName: SITE_NAME,
  title: "Custom Print Experts | American Design And Printing",
  description:
    "Your one-stop for trade printing—business cards, banners, invitations, and more. Powered by SinaLite.",
  manifest: "/site.webmanifest",
  // 🚀 Robots & Googlebot directives
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      // ✅ use hyphenated keys (and quote them)
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // ✅ Verification (set envs as needed)
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: {
      "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || "",
      "facebook-domain-verification":
        process.env.NEXT_PUBLIC_FACEBOOK_SITE_VERIFICATION || "",
      "p:domain_verify": process.env.NEXT_PUBLIC_PINTEREST_SITE_VERIFICATION || "",
    },
  },
  // ✅ Icons / Manifest
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#0047ab" }],
  },

  // ✅ IMPORTANT FIX:
  // Next 15 warns if themeColor is in metadata export.
  // themeColor belongs in `export const viewport`.
  // (Removed here on purpose.)

  // ✅ Helpful keywords (kept concise)
  keywords: [
    "trade printing",
    "custom printing",
    "business cards",
    "banners",
    "postcards",
    "large format",
    "American Design And Printing",
  ],
  alternates: {
    canonical: "/",
    languages: { "en-US": "/", "x-default": "/" },
  },
  openGraph: {
    title: "Custom Print Experts | American Design And Printing",
    description:
      "Shop business cards, postcards, signs, and custom print products—delivered fast!",
    url: SITE,
    siteName: SITE_NAME,
    images: DEFAULT_OG
      ? [
          {
            url: DEFAULT_OG,
            width: 1200,
            height: 630,
            alt: "American Design And Printing",
          },
        ]
      : undefined,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Custom Print Experts | American Design And Printing",
    description: "Premium print & promo with blazing fast shipping.",
    images: DEFAULT_OG ? [DEFAULT_OG] : undefined,
    site: process.env.NEXT_PUBLIC_TWITTER_HANDLE || undefined, // e.g. "@adapnow"
    creator: process.env.NEXT_PUBLIC_TWITTER_HANDLE || undefined,
  },
  // Nice-to-haves
  referrer: "strict-origin-when-cross-origin",
  category: "technology",
  authors: [{ name: SITE_NAME, url: SITE }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey && process.env.NODE_ENV !== "production") {
    console.warn("⚠️ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing");
  }

  // Build richer JSON-LD graph
  const logoObj = DEFAULT_OG
    ? {
        "@type": "ImageObject",
        url: DEFAULT_OG,
        width: 1200,
        height: 630,
      }
    : undefined;

  const contactPoint =
    SUPPORT_PHONE || SUPPORT_EMAIL
      ? [
          {
            "@type": "ContactPoint",
            telephone: SUPPORT_PHONE || undefined,
            email: SUPPORT_EMAIL || undefined,
            contactType: "customer service",
            areaServed: "US",
            availableLanguage: ["English"],
          },
        ]
      : undefined;

  const siteNav = [
    { name: "Home", href: "/" },
    { name: "Products", href: "/products" },
    { name: "Cart", href: "/cart" },
    { name: "Review Order", href: "/cart/review" },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE}#org`,
        name: SITE_NAME,
        url: SITE,
        logo: logoObj || DEFAULT_OG || undefined,
        sameAs: SOCIALS.length ? SOCIALS : undefined,
        contactPoint,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE}#website`,
        url: SITE,
        name: SITE_NAME,
        publisher: { "@id": `${SITE}#org` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE}/search?query={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      // 🚀 Helps Google understand your primary nav
      {
        "@type": "SiteNavigationElement",
        "@id": `${SITE}#site-navigation`,
        name: siteNav.map((i) => i.name),
        url: siteNav.map((i) => `${SITE}${i.href}`),
      },
    ],
  };

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        variables: {
          colorPrimary: "#0047ab",
          colorText: "hsl(210 40% 98%)",
          colorBackground: "hsl(222 47% 6%)",
          borderRadius: "14px",
          fontSize: "16px",
        },
        elements: {
          rootBox: "backdrop-blur-xl",
          card:
            "shadow-2xl ring-1 ring-white/10 !w-[440px] max-w-[94vw] " +
            "bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] " +
            "border border-white/10",
          header: "px-6 pt-6 pb-2",
          headerTitle: "text-[20px] font-semibold tracking-tight",
          headerSubtitle: "text-sm text-white/70",
          form: "px-6 pb-6",
          formFieldInput:
            "!h-12 !rounded-xl !bg-white/5 !border-white/10 focus:!ring-2 focus:!ring-[#2d6cdf]",
          formFieldLabel: "text-[13px] text-white/75",
          formFieldAction: "text-white/80 hover:text-white",
          formButtonPrimary:
            "!h-12 !rounded-xl !text-[15px] !font-semibold !bg-[#0047ab] hover:!bg-[#003a8f] " +
            "focus:!ring-2 focus:!ring-offset-2 focus:!ring-offset-neutral-900 focus:!ring-[#2d6cdf]",
          socialButtons: "!grid !gap-3",
          socialButtonsBlockButton:
            "!h-12 !rounded-xl !border-white/15 !bg-white/5 hover:!bg-white/10 !justify-center !gap-3 !w-full",
          socialButtonsProviderIcon: "!w-5 !h-5",
          socialButtonsBlockButtonText: "!text-[15px] !font-medium !text-white",
          footer: "opacity-60 text-xs",
        },
      }}
    >
      <html lang="en">
        <head>
          {/* Preconnects / DNS Prefetch for perf + SEO stability */}
          <link rel="dns-prefetch" href="https://imagedelivery.net" />
          <link rel="preconnect" href="https://imagedelivery.net" crossOrigin="" />
          <link rel="dns-prefetch" href="https://liveapi.sinalite.com" />
          <link rel="preconnect" href="https://liveapi.sinalite.com" crossOrigin="" />
          <link rel="dns-prefetch" href="https://api.sinaliteuppy.com" />
          <link rel="preconnect" href="https://api.sinaliteuppy.com" crossOrigin="" />
          <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
          <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
          <link rel="dns-prefetch" href="https://assets.clerk.dev" />
          <link rel="preconnect" href="https://assets.clerk.dev" crossOrigin="" />
          <link rel="dns-prefetch" href="https://clerk.com" />
          <link rel="preconnect" href="https://clerk.com" crossOrigin="" />
          <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="" />
          <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

          {/* External CSS */}
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/instantsearch.css@8.5.1/themes/satellite.css"
          />
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/@algolia/autocomplete-theme-classic@1.19.2/dist/theme.min.css"
          />

          {/* ✅ Structured data (Organization + WebSite + SiteNavigationElement) */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </head>

        {/* Keep your subtle premium background; all images via Cloudflare CDN */}
        <body className="min-h-screen bg-amber-50 text-slate-900 antialiased [background:radial-gradient(1200px_600px_at_120%_-10%,rgba(0,71,171,.25),transparent),radial-gradient(1200px_600px_at_-10%_110%,rgba(0,71,171,.18),transparent)]">
          <Suspense fallback={null}>
            <RouteProgressSlot />
          </Suspense>
          <NotificationBar />
          <Suspense fallback={null}>
            <HeaderSlot />
          </Suspense>
          {/* <Navigation items={NAV_ITEMS} /> */}
          <SupportBanner />
          <main>{children}</main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
