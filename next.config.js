/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";
const R2_PUBLIC_BASEURL = process.env.R2_PUBLIC_BASEURL || process.env.R2_PUBLIC_BASE || "";
const R2_DIRECT_HOST = process.env.R2_DIRECT_HOST || "";
const USE_NEXT_IMAGE_OPTIMIZER = process.env.USE_NEXT_IMAGE_OPTIMIZER !== "false"; // default true

let R2_PUBLIC_ORIGIN = "";
let R2_PUBLIC_HOST = "";
try {
  if (R2_PUBLIC_BASEURL) {
    const u = new URL(R2_PUBLIC_BASEURL);
    R2_PUBLIC_ORIGIN = u.origin;
    R2_PUBLIC_HOST = u.hostname;
  }
} catch {}

/* --- CSP: allow SinaLite (sandbox + live per Sinalite API docs) and Cloudflare CDN --- */
const scriptSrcList = [
  `'self'`,
  `'unsafe-inline'`,
  `'unsafe-eval'`,
  `https://js.stripe.com`,
  `https://challenges.cloudflare.com`,
  `https://cdn.jsdelivr.net`,
  `https://clerk.com`,
  `https://cdn.clerk.com`,
  `https://clerk-assets.com`,
  `https://assets.clerk.dev`,
  `https://*.clerk.accounts.dev`,
];

const connectSrcList = [
  `'self'`,
  `https://api.stripe.com`,
  `https://liveapi.sinalite.com`,
  `https://api.sinaliteuppy.com`,
  `https://*.upstash.io`,
  `https://*.algolia.net`,
  `https://*.algolianet.com`,
  `https://clerk.com`,
  `https://cdn.clerk.com`,
  `https://clerk-assets.com`,
  `https://assets.clerk.dev`,
  `https://api.clerk.com`,
  `https://*.clerk.com`,
  `https://*.clerk.dev`,
  `https://*.clerk.services`,
  `https://*.clerk.accounts.dev`,
  `https://cdn.jsdelivr.net`,
  `https://*.r2.cloudflarestorage.com`,
  `https://clerk-telemetry.com`,
  isDev ? `ws:` : ``,
  isDev ? `wss:` : ``,
].filter(Boolean);

const directives = {
  "default-src": `'self'`,
  "script-src": scriptSrcList.join(" "),
  "script-src-elem": scriptSrcList.join(" "),
  "style-src": [
    `'self'`,
    `'unsafe-inline'`,
    `https://cdn.jsdelivr.net`,
    `https://unpkg.com`,
    `https://fonts.googleapis.com`,
  ].join(" "),
  "img-src": [
    `'self'`,
    `data:`,
    `blob:`,
    `https://imagedelivery.net`,      // Cloudflare Images (CDN variants)
    `https://api.sinaliteuppy.com`,   // sandbox docs
    `https://liveapi.sinalite.com`,   // live docs
    `https://placehold.co`,
    `https://r2.cloudflarestorage.com`,
    R2_PUBLIC_ORIGIN,                 // your custom CDN host if set
  ].filter(Boolean).join(" "),
  "font-src": `'self' data: https://fonts.gstatic.com`,
  "media-src": `'self' https: data: blob:`,
  "worker-src": `'self' blob:`,
  "connect-src": connectSrcList.join(" "),
  "frame-src": `https://js.stripe.com https://hooks.stripe.com https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev https://challenges.cloudflare.com`,
  "object-src": `'none'`,
  "base-uri": `'self'`,
  "form-action": `'self' https://api.stripe.com`,
  "frame-ancestors": `'none'`, // pairs with X-Frame-Options: DENY
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

/* --- Next/Image remote patterns (Cloudflare Images + R2 + placeholders + SinaLite) --- */
const imageRemotePatterns = [
  { protocol: "https", hostname: "imagedelivery.net", pathname: "/**" },
  { protocol: "https", hostname: "api.sinaliteuppy.com", pathname: "/**" },
  { protocol: "https", hostname: "liveapi.sinalite.com", pathname: "/**" },
  { protocol: "https", hostname: "placehold.co", pathname: "/**" },
];

if (R2_PUBLIC_HOST) {
  imageRemotePatterns.push({ protocol: "https", hostname: R2_PUBLIC_HOST, pathname: "/**" });
}
if (R2_DIRECT_HOST) {
  imageRemotePatterns.push({ protocol: "https", hostname: R2_DIRECT_HOST, pathname: "/**" });
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: imageRemotePatterns,
    unoptimized: !USE_NEXT_IMAGE_OPTIMIZER,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    // Hard redirect legacy review pages → canonical
    return [
      { source: "/review-order", destination: "/cart/review", permanent: true },
      { source: "/revieworder", destination: "/cart/review", permanent: true },
      { source: "/order/review", destination: "/cart/review", permanent: true },
    ];
  },
    experimental: {
    serverComponentsExternalPackages: ["pg", "pg-connection-string", "pg-pool"],
  },
};

export default nextConfig;
