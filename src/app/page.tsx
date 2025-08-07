// ─────────────────────────────────────────
// src/app/page.tsx
// ─────────────────────────────────────────
import Hero from "@/components/Hero";
import FeaturedHighlights from "@/components/FeaturedHighlights";
import FeaturedCategories, {
  FeaturedCategory,
} from "@/components/FeaturedCategories";

import categoryAssets from "@/data/categoryAssets.json";
import {
  PiggyBankIcon,
  RibbonIcon,
  ClockIcon,
  CheckIcon,
} from "@/components/Icons";

export const metadata = {
  title: "Home",
  description:
    "Your one-stop for trade printing—business cards, banners, invitations, and more.",
};

export default function HomePage() {
  /* Build “Shop by Category” cards (first 3) */
  const categories: FeaturedCategory[] = Object.entries(categoryAssets)
    .slice(0, 3)
    .map(([slug, asset]: any) => ({
      slug,
      name: slug
        .split("-")
        .map((w: string) => w[0].toUpperCase() + w.slice(1))
        .join(" "),
      imageUrl: `https://imagedelivery.net/${process.env.NEXT_PUBLIC_CF_ACCOUNT}/${asset.imageId}/${asset.variant}`,
      href: `/category/${slug}`,
      description: asset.description,
    }));

  return (
    <div className="homepage">
      {/* ─── 0) HERO ─────────────────────────────────────────── */}
      <Hero />

      {/* ─── 1) FEATURED HIGHLIGHTS ─────────────────────────── */}
      <section className="featured-highlights container">
        <FeaturedHighlights maxItems={3} />
      </section>

      {/* ─── 2) SHOP BY CATEGORY ────────────────────────────── */}
      <section className="shop-by-category container">
        <h2 className="section-title">Shop By Featured Categories</h2>
        <FeaturedCategories categories={categories} />
      </section>

      {/* ─── 3) WHY CHOOSE US ───────────────────────────────── */}
      <section className="why-choose-us">
        <h2 className="section-title">Why Choose Us</h2>
        <div className="container grid-3">
          <div className="why-item">
            <PiggyBankIcon className="why-icon" />
            <h3>Low Trade Pricing</h3>
            <p>Make more money with our exclusive trade discounts.</p>
          </div>
          <div className="why-item">
            <RibbonIcon className="why-icon" />
            <h3>One-Stop Shop</h3>
            <p>Everything from business cards to banners.</p>
          </div>
          <div className="why-item">
            <ClockIcon className="why-icon" />
            <h3>Fast Turnaround</h3>
            <p>On-time delivery so you never miss a deadline.</p>
          </div>
        </div>
      </section>

      {/* ─── 4) OUR PROMISE ─────────────────────────────────── */}
      <section className="our-promise container">
        <h2 className="section-title">Our Promise To You</h2>
        <div className="promise-grid">
          <div className="promise-item">
            <CheckIcon className="promise-icon" />
            <p>On-time delivery anywhere in the USA</p>
          </div>
          <div className="promise-item">
            <CheckIcon className="promise-icon" />
            <p>No hidden costs, no delays, no paperwork</p>
          </div>
          <div className="promise-item">
            <CheckIcon className="promise-icon" />
            <p>24/7 live order tracking</p>
          </div>
        </div>
      </section>
    </div>
  );
}
