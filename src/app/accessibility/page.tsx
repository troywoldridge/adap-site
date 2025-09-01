import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Accessibility | ADAP",
  description:
    "ADAP is committed to digital accessibility. Learn about our WCAG conformance, compatibility, feedback options, and ongoing improvements.",
};

const updated = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

export default function AccessibilityPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Accessibility Statement
        </h1>
        <p className="mt-3 text-slate-700">
          ADAP is committed to providing a website that is accessible to the widest possible
          audience, regardless of technology or ability. We continuously improve the user
          experience for everyone and apply the relevant accessibility standards.
        </p>
        <p className="mt-2 text-sm text-slate-500">Last updated: {updated}</p>
      </header>

      <section className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Conformance Status</h2>
          <p className="mt-2 text-slate-700">
            Our goal is conformance with <strong>WCAG 2.1 Level AA</strong>. We design and test new
            experiences against these guidelines, focusing on keyboard accessibility, color
            contrast, semantic markup, and screen-reader support.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">Compatibility with Browsers & Assistive Tech</h2>
          <ul className="mt-2 list-inside list-disc text-slate-700">
            <li>Modern browsers: Chrome, Edge, Firefox, and Safari (latest two versions).</li>
            <li>Screen readers: NVDA (Windows) and VoiceOver (macOS / iOS).</li>
            <li>Responsive support from mobile through desktop breakpoints.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">Measures We Take</h2>
          <ul className="mt-2 list-inside list-disc text-slate-700">
            <li>Use semantic HTML and ARIA only when needed.</li>
            <li>Ensure focus states and logical tab order on interactive elements.</li>
            <li>Meet or exceed 4.5:1 color contrast for text and UI controls.</li>
            <li>Provide text alternatives for non-text content (including Cloudflare-served images).</li>
            <li>Regular audits as features evolve (guided by WCAG).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">Feedback & Contact</h2>
          <p className="mt-2 text-slate-700">
            Experiencing a barrier? We want to help. Contact us and we’ll work with you to provide
            the information you need in an accessible format.
          </p>
          <ul className="mt-2 space-y-1 text-slate-700">
            <li>
              Phone:{" "}
              <a className="text-blue-700 underline-offset-2 hover:underline" href="tel:1-866-899-2499">
                +1 606-541-0989
              </a>
            </li>
            <li>
              Contact form:{" "}
              <Link className="text-blue-700 underline-offset-2 hover:underline" href="/contact">
                Contact Us
              </Link>
            </li>
            <li>
              Support Center:{" "}
              <Link className="text-blue-700 underline-offset-2 hover:underline" href="/support">
                Support
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">Known Limitations</h2>
          <p className="mt-2 text-slate-700">
            While we strive for AA conformance, some third-party content (e.g., payment widgets or
            embedded carriers’ maps) may not fully meet guidelines. When possible we provide
            accessible fallbacks or alternatives.
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 p-4 text-blue-900">
          <p className="font-semibold">Continuous Improvement</p>
          <p className="mt-1">
            We test new features before release and schedule periodic reviews. If you discover an
            issue, please let us know—your feedback helps us prioritize fixes that matter.
          </p>
        </div>
      </section>

      <footer className="mt-8 text-center text-xs text-slate-500">
        Images are delivered via Cloudflare CDN variants for performance and clarity.
      </footer>
    </main>
  );
}
