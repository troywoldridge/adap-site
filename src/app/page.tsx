// src/app/page.tsx

import Hero from "@/components/Hero";
import FeaturedCategories from "@/components/FeaturedCategories";

export const metadata = {
  title: "Home | Custom Print Experts",
  description:
    "Top-class custom printing solutions: business cards, invitations, promotional items, and more. Fast turnaround, bold results.",
};

export default function HomePage() {
  return (
    <div className="page-wrapper">
     
      <main className="container">
        <Hero />
        <FeaturedCategories />

        {/* value-props strip, inspired by your screenshot */}
        <section
          aria-label="Why choose us"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "2rem",
            marginTop: "3rem",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "2rem 0",
          }}
        >
          <div
            style={{
              flex: "1 1 30%",
              minWidth: 220,
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            {/* Icon placeholder - swap with an inline SVG or image */}
            <div style={{ flexShrink: 0 }}>
              <svg width={32} height={32} aria-hidden="true">
                <circle cx={16} cy={16} r={15} stroke="#1e3a8a" fill="none" strokeWidth={2} />
                <text x="50%" y="55%" fontSize="14" textAnchor="middle" fill="#1e3a8a">
                  $
                </text>
              </svg>
            </div>
            <div>
              <strong>Low trade pricing</strong>
              <div style={{ fontSize: "0.9rem", marginTop: 4 }}>
                Make more money with competitive margins.
              </div>
            </div>
          </div>

          <div
            style={{
              flex: "1 1 30%",
              minWidth: 220,
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <svg width={32} height={32} aria-hidden="true">
                <rect
                  x={2}
                  y={2}
                  width={28}
                  height={28}
                  stroke="#1e3a8a"
                  fill="none"
                  strokeWidth={2}
                />
                <text x="50%" y="55%" fontSize="14" textAnchor="middle" fill="#1e3a8a">
                  ★
                </text>
              </svg>
            </div>
            <div>
              <strong>One-stop shop</strong>
              <div style={{ fontSize: "0.9rem", marginTop: 4 }}>
                Serve all your clients' printing needs in one place.
              </div>
            </div>
          </div>

          <div
            style={{
              flex: "1 1 30%",
              minWidth: 220,
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <svg width={32} height={32} aria-hidden="true">
                <circle cx={16} cy={16} r={15} stroke="#1e3a8a" fill="none" strokeWidth={2} />
                <text x="50%" y="55%" fontSize="14" textAnchor="middle" fill="#1e3a8a">
                  ⏱
                </text>
              </svg>
            </div>
            <div>
              <strong>Reliable fulfillment</strong>
              <div style={{ fontSize: "0.9rem", marginTop: 4 }}>
                Deliver high-quality products on time, every time.
              </div>
            </div>
          </div>
        </section>

        {/* secondary promise bar (with checkmarks) */}
<section
  aria-label="Our promise"
  style={{
    display: "flex",
    flexWrap: "wrap",
    gap: "2rem",
    marginTop: "1rem",
    justifyContent: "center",
    alignItems: "center",
    padding: "1.5rem 0",
    background: "#f5f8fb",
    borderRadius: 8,
  }}
>
  <div style={{ flex: "1 1 220px", minWidth: 180, display: "flex", alignItems: "center", gap: 12 }}>
    <div aria-hidden="true">
      {/* checkmark SVG */}
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="11" stroke="#4ade80" strokeWidth="2" />
        <path
          d="M7 13l3 3 7-7"
          stroke="#22c55e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
    <div>
      <div style={{ fontWeight: 600 }}>On time delivery anywhere in USA</div>
    </div>
  </div>

  <div style={{ flex: "1 1 220px", minWidth: 180, display: "flex", alignItems: "center", gap: 12 }}>
    <div aria-hidden="true">
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="11" stroke="#4ade80" strokeWidth="2" />
        <path
          d="M7 13l3 3 7-7"
          stroke="#22c55e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
    <div>
      <div style={{ fontWeight: 600 }}>No hidden costs, no delays, & no paperwork</div>
    </div>
  </div>

  <div style={{ flex: "1 1 220px", minWidth: 180, display: "flex", alignItems: "center", gap: 12 }}>
    <div aria-hidden="true">
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="11" stroke="#4ade80" strokeWidth="2" />
        <path
          d="M7 13l3 3 7-7"
          stroke="#22c55e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
    <div>
      <div style={{ fontWeight: 600 }}>24/7 live order tracking</div>
    </div>
  </div>
</section>


        
      </main>
    </div>
  );
}
