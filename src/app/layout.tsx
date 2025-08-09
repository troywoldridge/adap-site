import "./globals.css";
import NotificationBar from "@/components/NotificationBar";
import TopNav from "@/components/TopNav";
import Header from "@/components/Header";
import MainNav from "@/components/MainNav";
import SupportBanner from "@/components/SupportBanner";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom Print Experts | American Design And Printing",
  description:
    "Your one-stop for trade printing—business cards, banners, invitations, and more. Powered by Sinalite. Blazing fast turnaround and amazing support.",
  openGraph: {
    title: "Custom Print Experts | American Design And Printing",
    description:
      "Shop business cards, postcards, signs, and custom print products—delivered with lightning-fast turnaround!",
    url: "https://americandesignandprinting.com/",
    siteName: "American Design And Printing",
    images: [
      {
        url: "https://imagedelivery.net/<YOUR_CLOUDFLARE_HASH>/<HERO_IMAGE_ID>/public",
        width: 1200,
        height: 630,
        alt: "American Design And Printing - Premium Print Products",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Custom Print Experts | American Design And Printing",
    description:
      "Shop premium print & promo with blazing-fast shipping and stellar support.",
    images: [
      "https://imagedelivery.net/<YOUR_CLOUDFLARE_HASH>/<HERO_IMAGE_ID>/public",
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
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