// next.config.mjs
/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

// If you read files via a CDN domain (recommended), put it in R2_PUBLIC_BASEURL
// e.g. https://cdn.adap.com/artwork
const R2_PUBLIC_BASEURL = process.env.R2_PUBLIC_BASEURL || "";
let R2_PUBLIC_ORIGIN = "";
let R2_PUBLIC_HOST = "";
try {
  if (R2_PUBLIC_BASEURL) {
    const u = new URL(R2_PUBLIC_BASEURL);
    R2_PUBLIC_ORIGIN = u.origin;       // scheme+host
    R2_PUBLIC_HOST = u.hostname;       // host only for next/image remotePatterns
  }
} catch { /* ignore */ }

const ContentSecurityPolicy = [
  // baseline
  "default-src 'self'",

  // scripts (Stripe + Cloudflare Turnstile + Clerk loader via jsdelivr)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://challenges.cloudflare.com https://cdn.jsdelivr.net",

  // styles
  "style-src 'self' 'unsafe-inline'",

  // images (Cloudflare Images + Sinalite previews + R2 reads via CDN or direct)
  [
    "img-src 'self' data: blob:",
    "https://imagedelivery.net",
    "https://api.sinaliteuppy.com",
    "https://liveapi.sinalite.com",
    "https://placehold.co",
    "https://*.r2.cloudflarestorage.com", // direct R2 reading (if you ever render direct URLs)
    R2_PUBLIC_ORIGIN,                     // your CDN origin for R2, e.g. https://cdn.adap.com
  ].filter(Boolean).join(" "),

  // fonts/media/workers
  "font-src 'self' data:",
  "media-src 'self' https: data: blob:",
  "worker-src 'self' blob:",

  // XHR/fetch/WebSocket
  [
    "connect-src 'self'",
    "https://api.stripe.com",
    "https://liveapi.sinalite.com",     // Sinalite API docs: pricing
    "https://api.sinaliteuppy.com",     // Sinalite API docs: auth/token etc.
    "https://*.upstash.io",
    "https://*.algolia.net",            // Algolia primary
    "https://*.algolianet.com",         // Algolia failover
    "https://*.clerk.com",              // Clerk
    "https://*.clerk.services",
    "https://cdn.jsdelivr.net",         // Clerk JS loader
    "https://*.r2.cloudflarestorage.com", // R2 presigned PUT host(s)
    isDev ? "ws:" : "",                 // HMR in dev
    isDev ? "wss:" : "",
  ].filter(Boolean).join(" "),

  // frames (Stripe + Clerk)
  "frame-src https://js.stripe.com https://hooks.stripe.com https://*.clerk.com",

  // misc hardening
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://api.stripe.com",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

// Build remotePatterns for next/image
const imageRemotePatterns = [
  { protocol: "https", hostname: "imagedelivery.net", pathname: "/**" },   // Cloudflare Images (product photos)
  { protocol: "https", hostname: "api.sinaliteuppy.com", pathname: "/**" },
  { protocol: "https", hostname: "liveapi.sinalite.com", pathname: "/**" },
  { protocol: "https", hostname: "placehold.co", pathname: "/**" },
  // If you ever show images direct from R2 (not needed for uploads, but safe):
  { protocol: "https", hostname: "*.r2.cloudflarestorage.com", pathname: "/**" },
];

// Add your CDN host (if set) so next/image can optimize it too
if (R2_PUBLIC_HOST) {
  imageRemotePatterns.push({ protocol: "https", hostname: R2_PUBLIC_HOST, pathname: "/**" });
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
