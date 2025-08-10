import Hero from "@/components/Hero";
import FeaturedCategories from "@/components/FeaturedCategories";
import { getLocalCategories } from "@/lib/catalogLocal";

export default function HomePage() {
  const categories = getLocalCategories();

  // Choose exactly the two you want featured (by slug):
  const featuredSlugs = ["business-cards", "large-format"]; // <- change as you like

  const featured = featuredSlugs
    .map((slug) => categories.find((c) => c.slug === slug))
    .filter(Boolean)
    .map((c) => ({
      slug: c!.slug,
      name: c!.name,
      imageUrl: c!.image || "", // catalogLocal builds Cloudflare URL for you
      href: `/categories/${c!.slug}`, // adjust route as needed
      description: c!.description,
    }));

  return (
    <main>
      <Hero />
      <FeaturedCategories categories={featured} /* limit optional now */ />
    </main>
  );
}
