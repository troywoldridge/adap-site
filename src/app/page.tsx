// src/app/page.tsx
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Home | Custom Print Experts',
  description:
    'Top-class custom printing solutions: business cards, invitations, promotional items, and more. Fast turnaround, dynamic pricing, and professional quality.',
};

export default function HomePage() {
  return (
    <div className="page-wrapper">
      <Navbar />
      <Header />

      <main className="container">
        <section className="hero" aria-label="Welcome section">
          <div className="hero-content">
            <h1>🎉 Welcome to Custom Print Experts</h1>
            <p>
              You’re seeing the new scaffold. Header and Navbar are wired up and global styles are
              applied. We’re building out the rest piece by piece—start a feature, add components,
              and ship something great.
            </p>
            <a href="/category/business-cards" className="button">
              Shop Business Cards
            </a>
          </div>
        </section>

        <section aria-label="Getting started" className="getting-started">
          <div className="content-wrapper">
            <h2>What&apos;s Next</h2>
            <ul>
              <li>Build out Featured Products component</li>
              <li>Add dynamic pricing panel</li>
              <li>Integrate real product data from Sinalite</li>
              <li>Enhance SEO and share previews</li>
            </ul>
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          <p>© {new Date().getFullYear()} Custom Print Experts. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
