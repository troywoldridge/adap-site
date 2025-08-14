// next.config.mjs
/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

/**
 * If you read files via a CDN domain (recommended), put it in R2_PUBLIC_BASEURL
 *   e.g. https://cdn.adap.com/artwork
 * If you also want to ALLOW rendering images directly from the R2 bucket endpoint,
 *   set R2_DIRECT_HOST, e.g. adap-artwork.720ec85be65a483a3e34400d56dba5d8.r2.cloudflarestorage.com
 */
const R2_PUBLIC_BASEURL = process.env.R2_PUBLIC_BASEURL || "";
const R2_DIRECT_HOST = process.env.R2_DIRECT_HOST || "";

let R2_PUBLIC_ORIGIN = "";
let R2_PUBLIC_HOST = "";
try {
  if (R2_PUBLIC_BASEURL) {
    const u = new URL(R2_PUBLIC_BASEURL);
    R2_PUBLIC_ORIGIN = u.origin;  // scheme+host
    R2_PUBLIC_HOST = u.hostname;  // host only (for next/image)
  }
} catch {
  // ignore invalid URL
}

/** Build CSP without duplicated directives */
const directives = {
  "default-src": `'self'`,

  // Scripts: Stripe, Cloudflare Turnstile, Clerk (JS + loader on jsDelivr)
  "script-src": [
    `'self'`,
    `'unsafe-inline'`,
    `'unsafe-eval'`,
    `https://js.stripe.com`,
    `https://challenges.cloudflare.com`,
    `https://cdn.jsdelivr.net`,
    `https://clerk-assets.com`,
    `https://*.clerk.com`,
    `https://*.clerk.dev`,
  ].join(" "),

  // Styles (Algolia themes or fonts if you use them)
  "style-src": [
    `'self'`,
    `'unsafe-inline'`,
    `https://cdn.jsdelivr.net`,
    `https://unpkg.com`,
    `https://fonts.googleapis.com`,
  ].join(" "),

  // Images (Cloudflare Images + SinaLite + placeholders + optional R2 CDN/direct)
  "img-src": [
    `'self'`,
    `data:`,
    `blob:`,
    `https://imagedelivery.net`,
    `https://api.sinaliteuppy.com`,
    `https://liveapi.sinalite.com`,
    `https://placehold.co`,
    `https://*.r2.cloudflarestorage.com`,
    R2_PUBLIC_ORIGIN, // e.g. https://cdn.adap.com
  ]
    .filter(Boolean)
    .join(" "),

  // Fonts / media / workers
  "font-src": `'self' data: https://fonts.gstatic.com'`,
  "media-src": `'self' https: data: blob:'`,
  "worker-src": `'self' blob:'`,

  // XHR/fetch/WebSocket
  "connect-src": [
    `'self'`,
    `https://api.stripe.com`,
    `https://liveapi.sinalite.com`,     // per SinaLite API docs
    `https://api.sinaliteuppy.com`,     // per SinaLite API docs
    `https://*.upstash.io`,
    `https://*.algolia.net`,
    `https://*.algolianet.com`,
    `https://clerk-assets.com`,
    `https://*.clerk.com`,
    `https://*.clerk.dev`,
    `https://*.clerk.services`,
    `https://cdn.jsdelivr.net`,
    `https://*.r2.cloudflarestorage.com`,
    isDev ? `ws:` : ``,
    isDev ? `wss:` : ``,
  ]
    .filter(Boolean)
    .join(" "),

  // Frames (Stripe + Clerk + Turnstile)
  "frame-src": `https://js.stripe.com https://hooks.stripe.com https://*.clerk.com https://*.clerk.dev https://challenges.cloudflare.com`,

  // Hardening
  "object-src": `'none'`,
  "base-uri": `'self'`,
  "form-action": `'self' https://api.stripe.com'`,
};

const ContentSecurityPolicy = Object.entries(directives)
  .map(([k, v]) => `${k} ${v}`)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/** next/image remote patterns */
const imageRemotePatterns = [
  { protocol: "https", hostname: "imagedelivery.net", pathname: "/**" }, // Cloudflare Images (CDN)
  { protocol: "https", hostname: "api.sinaliteuppy.com", pathname: "/**" },
  { protocol: "https", hostname: "liveapi.sinalite.com", pathname: "/**" },
  { protocol: "https", hostname: "placehold.co", pathname: "/**" },
];

// Add your CDN host (if set) so next/image can optimize it too
if (R2_PUBLIC_HOST) {
  imageRemotePatterns.push({ protocol: "https", hostname: R2_PUBLIC_HOST, pathname: "/**" });
}
// Optional: allow direct R2 bucket host rendering (not required for uploads)
if (R2_DIRECT_HOST) {
  imageRemotePatterns.push({ protocol: "https", hostname: R2_DIRECT_HOST, pathname: "/**" });
}

const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: imageRemotePatterns },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    // turbo: false,
  },
};

export default nextConfig;
