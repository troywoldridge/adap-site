import { getCategories } from "@/lib/sinalite.client";
import { mergeCategory } from "@/lib/mergeUtils";
import Hero from "@/components/Hero";
import CategoryGrid from "@/components/CategoryGrid";
import type { Metadata } from "next";

// 1. SEO & Social Metadata
export const metadata: Metadata = {
  title: "Premium Print Products | American Design And Printing",
  description:
    "Discover top-quality print and promotional products. Shop business cards, brochures, banners & more—powered by Sinalite. Fast shipping. Amazing prices.",
  openGraph: {
    title: "Premium Print Products | American Design And Printing",
    description:
      "Shop business cards, postcards, signs, and custom print products—delivered with lightning-fast turnaround!",
    url: "https://americandesignandprinting.com/",
    siteName: "American Design And Printing",
    images: [
      {
        url: "https://imagedelivery.net/<YOUR_CLOUDFLARE_HASH>/<YOUR_HERO_IMAGE_ID>/public",
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
    title: "Premium Print Products | American Design And Printing",
    description: "Shop premium print & promo with blazing-fast shipping.",
    images: [
      "https://imagedelivery.net/<YOUR_CLOUDFLARE_HASH>/<YOUR_HERO_IMAGE_ID>/public",
    ],
  },
};

// 2. The Actual Page (Server Component)
export default async function HomePage() {
  const storeCode = process.env.NEXT_PUBLIC_STORE_CODE;
  if (!storeCode) {
    return (
      <main className="container py-10">
        <h1 className="text-red-700 font-bold text-2xl">Missing Store Code!</h1>
        <p>
          Please set <code>NEXT_PUBLIC_STORE_CODE</code> in your environment.
        </p>
      </main>
    );
  }

  const categories = await getCategories(storeCode);
  const mergedCategories = categories.map(mergeCategory);

  return (
    <main>
      <Hero />
      <CategoryGrid categories={mergedCategories} />
    </main>
  );
}
