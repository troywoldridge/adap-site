// src/components/SiteFooter.tsx
import Link from "next/link";
import Image from "@/components/ImageSafe";

// Cloudflare Images (env-driven with safe defaults)
const CF_HASH = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH ?? "";
const DEFAULT_LOGO_ID = "a90ba357-76ea-48ed-1c65-44fff4401600"; // your logo image id
const CF_LOGO_ID = process.env.NEXT_PUBLIC_CF_LOGO_ID ?? DEFAULT_LOGO_ID;

// Always provide a valid string URL to <Image>
const logoUrl = CF_HASH
  ? `https://imagedelivery.net/${CF_HASH}/${CF_LOGO_ID}/public`
  : "/logo-footer.png"; // local fallback (place a file in /public if you want this)

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-gray-200 bg-blue-900 text-blue-50">
      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Top grid */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand / hours / phone / social */}
          <div>
            <div className="flex items-center gap-3">
              <Image
                src={logoUrl}
                alt="ADAP — Custom Print Experts"
                width={72}
                height={72}
                className="h-14 w-14 rounded-md bg-white object-contain"
                priority
              />

              <div>
                <div className="text-lg font-bold leading-tight">ADAP</div>
                <div className="text-xs text-blue-200">Custom Print Experts</div>
              </div>
            </div>

            <div className="mt-4 text-sm leading-6 text-blue-100">
              <div className="font-semibold text-blue-50">Business Hours</div>
              <div>Monday to Friday</div>
              <div>Customer Service: 8 AM – 5 PM EST</div>
              <div>Local Pickup: 8 AM – 4 PM EST</div>
            </div>

            <a
              href="tel:1-866-899-2499"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4"
                fill="currentColor"
              >
                <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V21a1 1 0 01-1 1C11.4 22 2 12.6 2 1a1 1 0 011-1h3.5a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.24 1.02l-2.2 2.2z" />
              </svg>
              1-866-899-2499
            </a>

            <div className="mt-4 flex items-center gap-4">
              {/* Replace href with your real profiles */}
              <a href="#" aria-label="Facebook" className="hover:text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M22 12a10 10 0 10-11.6 9.9v-7h-2v-3h2V9.5c0-2 1.2-3.1 3-3.1.9 0 1.8.16 1.8.16v2h-1c-1 0-1.3.63-1.3 1.3V12h2.3l-.36 3h-1.94v7A10 10 0 0022 12z" />
                </svg>
              </a>
              <a href="#" aria-label="Instagram" className="hover:text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm0 2a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H7zm5 3.5A5.5 5.5 0 1111.5 18 5.5 5.5 0 0112 7.5zm0 2A3.5 3.5 0 1015.5 13 3.5 3.5 0 0012 9.5zM18 6.3a1 1 0 11-1 1 1 1 0 011-1z" />
                </svg>
              </a>
              <a href="#" aria-label="YouTube" className="hover:text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.4 3.5 12 3.5 12 3.5s-7.4 0-9.4.6A3 3 0 00.5 6.2 36.4 36.4 0 000 12a36.4 36.4 0 00.5 5.8 3 3 0 002.1 2.1c2 .6 9.4.6 9.4.6s7.4 0 9.4-.6a3 3 0 002.1-2.1A36.4 36.4 0 0024 12a36.4 36.4 0 00-.5-5.8zM9.8 15.5v-7l6 3.5-6 3.5z" />
                </svg>
              </a>
              <a href="#" aria-label="LinkedIn" className="hover:text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.5 8.5H4.5V23H.5zM8.5 8.5H12v2h.05c.49-.93 1.7-1.9 3.5-1.9 3.75 0 4.45 2.47 4.45 5.66V23h-4V15.8c0-1.72-.03-3.94-2.4-3.94-2.41 0-2.78 1.88-2.78 3.82V23h-4V8.5z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2 */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-200">
              ADAP
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link className="hover:text-white" href="/about">About American Design And Printing</Link></li>
              <li><Link className="hover:text-white" href="/reviews">Reviews</Link></li>
              <li><Link className="hover:text-white" href="/careers">Careers</Link></li>
              <li><Link className="hover:text-white" href="/terms">Terms of Service</Link></li>
              <li><Link className="hover:text-white" href="/privacy">Privacy Policy</Link></li>
              <li><Link className="hover:text-white" href="/contact">Contact Us</Link></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-200">
              Our Services
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link className="hover:text-white" href="/guarantees">Our Guarantees</Link></li>
              <li><Link className="hover:text-white" href="/shipping">Shipping Options</Link></li>
              <li><Link className="hover:text-white" href="/turnaround">Turnaround Options</Link></li>
              <li><Link className="hover:text-white" href="/quotes">Custom Quotes</Link></li>
              <li><Link className="hover:text-white" href="/submit-custom-order">Submit Custom Order</Link></li>
            </ul>
          </div>

          {/* Column 4 */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-200">
              Resources
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link className="hover:text-white" href="/support">Support Center</Link></li>
              <li><Link className="hover:text-white" href="/guides">Artwork Setup Guides</Link></li>
              <li><Link className="hover:text-white" href="/business-tools">Business Tools</Link></li>
              <li><Link className="hover:text-white" href="/accessibility">Accessibility</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-blue-800 pt-6 text-xs text-blue-300 sm:flex-row">
          <p>© {year} ADAP. All rights reserved.</p>
          <div className="space-x-4">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/accessibility" className="hover:text-white">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
