import Hero from "@/components/Hero";
import FeaturedCategories from "@/components/FeaturedCategories";
import { getLocalCategories } from "@/lib/catalogLocal";

// Minimal shape to satisfy TypeScript
type LocalCategory = {
  slug: string;
  name: string;
  image?: string | null;
  description?: string | null;
};

export default function HomePage() {
  // must be inside the component
  const categories = getLocalCategories() as LocalCategory[];

  // Show Business Cards, Large Format, and Print Products
  const featuredSlugs = ["business-cards", "large-format", "print-products"];

  const featured = featuredSlugs
    .map((slug) => categories.find((c: LocalCategory) => c.slug === slug))
    .filter(Boolean)
    .map((c) => ({
      slug: c!.slug,
      name: c!.name,
      imageUrl: c!.image || "", // Cloudflare Images URL built in catalogLocal
      href: `/categories/${c!.slug}`,
      description: c!.description ?? undefined,
    }));

  return (
    <main>
      {/* Hero */}
      <Hero />

      {/* Featured Category Cards */}
      <section className="shop-by-category">
        <div className="container">
          <h2 className="section-title">Shop by Category</h2>
          <FeaturedCategories categories={featured} limit={3} />
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="why-choose-us">
        <div className="container">
          <h2 className="section-title">Why choose ADAP?</h2>
          <div className="grid-3">
            <div className="flex items-center">
              <span className="promise-icon" aria-hidden>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M3 13a6 6 0 016-6h4a5 5 0 015 5v2h-2l-1.5 3H7l-1-2H3v-2z" stroke="#0047ab" strokeWidth="1.6" />
                  <circle cx="9.5" cy="8" r="1" fill="#0047ab" />
                </svg>
              </span>
              <p className="ml-3">Make more money with low trade pricing</p>
            </div>

            <div className="flex items-center">
              <span className="promise-icon" aria-hidden>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="#0047ab" strokeWidth="1.6" />
                  <path d="M9 13l-3 8 6-3 6 3-3-8" stroke="#0047ab" strokeWidth="1.6" fill="none" />
                </svg>
              </span>
              <p className="ml-3">Become a one-stop shop for your clients’ printing needs</p>
            </div>

            <div className="flex items-center">
              <span className="promise-icon" aria-hidden>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="8" stroke="#0047ab" strokeWidth="1.6" />
                  <path d="M12 7v5l3 2" stroke="#0047ab" strokeWidth="1.6" />
                </svg>
              </span>
              <p className="ml-3">Get repeat orders by delivering high-quality products on time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Promise */}
      <section className="our-promise">
        <div className="container">
          <h2 className="section-title">Our promise to you:</h2>
          <div className="promise-grid">
            <div className="promise-item">
              <span className="promise-icon" aria-hidden>✔</span>
              <p>On time delivery anywhere in USA</p>
            </div>
            <div className="promise-item">
              <span className="promise-icon" aria-hidden>✔</span>
              <p>No hidden costs, no delays, &amp; no paperwork</p>
            </div>
            <div className="promise-item">
              <span className="promise-icon" aria-hidden>✔</span>
              <p>24/7 live order tracking</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
