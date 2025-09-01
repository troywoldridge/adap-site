import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | American Design And Printing",
  description:
    "Learn more about American Design And Printing (ADAP) – our story, mission, and commitment to delivering high-quality print, packaging, and promotional products.",
};

export default function AboutPage() {
  return (
    <main className="container mx-auto px-6 py-12 prose">
      <h1>About American Design And Printing</h1>
      <p>
        At <strong>American Design And Printing (ADAP)</strong>, we believe
        every brand deserves to stand out with unforgettable print, packaging,
        and promotional products. What started as a passion for design and
        high-quality printing has grown into a full-service platform that
        empowers businesses of all sizes — from local startups to established
        enterprises — to tell their story through print.
      </p>
      <p>
        We’re more than just printers. We’re problem-solvers, designers, and
        partners who understand that quality, speed, and reliability matter
        most. By combining state-of-the-art technology with decades of industry
        expertise, we deliver products that exceed expectations every single
        time.
      </p>
      <h2>Our Promise</h2>
      <ul>
        <li>
          <strong>Premium Quality</strong> — materials that last, colors that
          pop, and finishes that impress.
        </li>
        <li>
          <strong>Fair Pricing</strong> — wholesale efficiency at competitive
          rates.
        </li>
        <li>
          <strong>On-Time Delivery</strong> — because deadlines aren’t optional.
        </li>
        <li>
          <strong>Personal Support</strong> — real people, ready to help.
        </li>
      </ul>
      <p>
        At ADAP, your brand is our canvas. Let’s print something unforgettable
        together.
      </p>
    </main>
  );
}
