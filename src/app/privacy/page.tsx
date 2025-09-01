import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | American Design And Printing",
  description:
    "Read the Privacy Policy for American Design And Printing (ADAP). Learn how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <main className="container mx-auto px-6 py-12 prose">
      <h1>Privacy Policy</h1>
      <p>
        <em>Last updated: {new Date().toLocaleDateString()}</em>
      </p>
      <p>We respect your privacy and are committed to protecting your data.</p>
      <h2>What We Collect</h2>
      <p>
        We may collect your name, contact details, shipping/billing info, and
        files you upload for print.
      </p>
      <h2>How We Use Your Data</h2>
      <ul>
        <li>To process orders and deliver products</li>
        <li>To provide customer support</li>
        <li>To improve our services</li>
      </ul>
      <h2>Data Security</h2>
      <p>
        We use encryption, secure servers, and trusted third-party processors to
        keep your data safe.
      </p>
      <h2>Third-Party Services</h2>
      <p>
        Some orders are fulfilled via trusted partners (like Sinalite). Only the
        necessary data is shared.
      </p>
      <h2>Cookies</h2>
      <p>
        We use cookies to improve your browsing and shopping experience on our
        site.
      </p>
      <h2>Your Rights</h2>
      <p>
        You may request access, updates, or deletion of your personal
        information at any time.
      </p>
      <p>
        For privacy concerns, email us at{" "}
        <a href="mailto:privacy@adap.com">privacy@adap.com</a>.
      </p>
    </main>
  );
}
