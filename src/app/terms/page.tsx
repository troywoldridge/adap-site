import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | American Design And Printing",
  description:
    "Read the Terms of Service for American Design And Printing (ADAP).",
};

export default function TermsPage() {
  return (
    <main className="container mx-auto px-6 py-12 prose">
      <h1>Terms of Service</h1>
      <p>
        <em>Last updated: {new Date().toLocaleDateString()}</em>
      </p>
      <ol>
        <li>
          <strong>Eligibility</strong> — You must be at least 18 years old or
          have parental/guardian consent.
        </li>
        <li>
          <strong>Products & Pricing</strong> — All prices are subject to change
          without notice. We reserve the right to modify or discontinue products
          at any time.
        </li>
        <li>
          <strong>Orders & Payment</strong> — Orders are final once placed.
          Payment must be completed before production begins.
        </li>
        <li>
          <strong>Production & Delivery</strong> — Timelines are estimates. We
          are not liable for delays outside our control (e.g., shipping
          carriers, weather).
        </li>
        <li>
          <strong>Returns & Refunds</strong> — Custom products are
          non-refundable. If a product arrives defective, contact us within 7
          days for resolution.
        </li>
        <li>
          <strong>Intellectual Property</strong> — All site content, logos, and
          designs belong to ADAP unless otherwise noted.
        </li>
        <li>
          <strong>Limitation of Liability</strong> — ADAP is not responsible for
          any indirect or consequential damages from the use of our Service.
        </li>
      </ol>
      <p>
        For questions about these Terms, please contact us at{" "}
        <a href="mailto:support@adap.com">support@adap.com</a>.
      </p>
    </main>
  );
}
