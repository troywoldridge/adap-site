// src/app/page.tsx
import Header from "@/components/Header";
import Hero from "@/components/Hero";

export const metadata = {
  title: "Home | Custom Print Experts",
  description:
    "Top-class custom printing solutions: business cards, invitations, promotional items, and more. Fast turnaround, bold results.",
};

export default function HomePage() {
  return (
    <div className="page-wrapper">
      <Header />
      <main className="container">
        <Hero />
        <section aria-label="Getting started" style={{ marginTop: "3rem" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <h2>What's Next</h2>
            <ul>
              <li>Build out Featured Products component</li>
              <li>Add dynamic pricing panel</li>
              <li>Integrate real product data from Sinalite</li>
              <li>Enhance SEO and share previews</li>
            </ul>
          </div>
        </section>
      </main>
      
        </div>
  );
}

