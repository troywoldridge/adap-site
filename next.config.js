// next.config.mjs
/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";
const R2_PUBLIC_BASEURL = process.env.R2_PUBLIC_BASEURL || process.env.R2_PUBLIC_BASE || "";
const R2_DIRECT_HOST = process.env.R2_DIRECT_HOST || "";
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_BUCKET = process.env.R2_BUCKET || "";
const USE_NEXT_IMAGE_OPTIMIZER = process.env.USE_NEXT_IMAGE_OPTIMIZER !== "false";

// Compute public origin pieces
let R2_PUBLIC_ORIGIN = "";
let R2_PUBLIC_HOST = "";
let R2_PUBLIC_PROTOCOL = "";
let R2_PUBLIC_PORT = "";

try {
  if (R2_PUBLIC_BASEURL) {
    const u = new URL(R2_PUBLIC_BASEURL);
    R2_PUBLIC_ORIGIN = u.origin;
    R2_PUBLIC_HOST = u.hostname;
    R2_PUBLIC_PROTOCOL = u.protocol.replace(":", "");
    R2_PUBLIC_PORT = u.port || "";
  }
} catch {}

// Direct bucket host (presigned PUT target)
const R2_BUCKET_HOST =
  R2_BUCKET && R2_ACCOUNT_ID ? `${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : "";

const R2_DIRECT_HTTPS = R2_DIRECT_HOST ? `https://${R2_DIRECT_HOST}` : "";
const R2_DIRECT_HTTP = R2_DIRECT_HOST ? `http://${R2_DIRECT_HOST}` : "";

/* --- CSP --- */
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
  `https://clerk.dev`,
  `https://clerk.services`,
  `https://clerk.accounts.dev`,
  `https://*.clerk.accounts.dev`,
  `https://cdn.jsdelivr.net`,
  // R2 endpoints
  `https://r2.cloudflarestorage.com`,
  `https://*.r2.cloudflarestorage.com`, // presigned PUT bucket subdomains
  R2_BUCKET_HOST ? `https://${R2_BUCKET_HOST}` : "",
  R2_PUBLIC_ORIGIN, // if you ever fetch via your public CDN origin
  R2_DIRECT_HTTPS,
  R2_DIRECT_HTTP,
  `https://clerk-telemetry.com`,
  isDev ? `ws:` : ``,
  isDev ? `wss:` : ``,
  isDev ? `http://localhost:3000` : ``,
].filter(Boolean);

const imgSrcList = [
  `'self'`,
  `data:`,
  `blob:`,
  `https://imagedelivery.net`,           // Cloudflare Images CDN
  `https://api.sinaliteuppy.com`,
  `https://liveapi.sinalite.com`,
  `https://r2.cloudflarestorage.com`,
  `https://*.r2.cloudflarestorage.com`,  // ✅ fixed wildcard
  R2_PUBLIC_ORIGIN,
  R2_DIRECT_HTTPS,
  R2_DIRECT_HTTP,
  isDev ? `http://localhost:3000` : ``,
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
  "img-src": imgSrcList.join(" "),
  "font-src": `'self' data: https://fonts.gstatic.com`,
  "media-src": `'self' https: data: blob:`,
  "worker-src": `'self' blob:`,
  "connect-src": connectSrcList.join(" "),
  "frame-src":
    `https://js.stripe.com https://hooks.stripe.com https://clerk.com https://clerk.dev https://clerk.accounts.dev https://*.clerk.accounts.dev https://challenges.cloudflare.com`,
  "object-src": `'none'`,
  "base-uri": `'self'`,
  "form-action": `'self' https://api.stripe.com`,
  "frame-ancestors": `'none'`,
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

/* --- next/image remotePatterns ---
   NOTE: Next.js remotePatterns typically expect exact hostnames (wildcards may not match).
*/
const imageRemotePatterns = [
  { protocol: "https", hostname: "imagedelivery.net", pathname: "/**" },
  { protocol: "https", hostname: "api.sinaliteuppy.com", pathname: "/**" },
  { protocol: "https", hostname: "liveapi.sinalite.com", pathname: "/**" },
  { protocol: "https", hostname: "r2.cloudflarestorage.com", pathname: "/**" },
];

// Add public CDN origin host (from R2_PUBLIC_BASEURL)
if (R2_PUBLIC_HOST) {
  imageRemotePatterns.push(
    R2_PUBLIC_PORT
      ? { protocol: R2_PUBLIC_PROTOCOL || "https", hostname: R2_PUBLIC_HOST, pathname: "/**", port: R2_PUBLIC_PORT }
      : { protocol: R2_PUBLIC_PROTOCOL || "https", hostname: R2_PUBLIC_HOST, pathname: "/**" }
  );
}

// Add direct bucket host (env override)
if (R2_DIRECT_HOST) {
  imageRemotePatterns.push({ protocol: "https", hostname: R2_DIRECT_HOST, pathname: "/**" });
  imageRemotePatterns.push({ protocol: "http", hostname: R2_DIRECT_HOST, pathname: "/**" });
}

// Add computed bucket host if available (bucket.account.r2.cloudflarestorage.com)
if (R2_BUCKET_HOST) {
  imageRemotePatterns.push({ protocol: "https", hostname: R2_BUCKET_HOST, pathname: "/**" });
}

if (isDev) {
  imageRemotePatterns.push({ protocol: "http", hostname: "localhost", port: "3000", pathname: "/**" });
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: imageRemotePatterns,
    unoptimized: !USE_NEXT_IMAGE_OPTIMIZER, // let Cloudflare handle optimization if false
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // ✅ Temporary redirects for categories not ready at launch
      { source: "/category/promotional", destination: "/coming-soon/promotional", permanent: false },
      { source: "/category/promotional/:path*", destination: "/coming-soon/promotional", permanent: false },
      { source: "/category/apparel", destination: "/coming-soon/apparel", permanent: false },
      { source: "/category/apparel/:path*", destination: "/coming-soon/apparel", permanent: false },

      // common typos
      { source: "/category/promotionas", destination: "/coming-soon/promotional", permanent: false },
      { source: "/category/apperal", destination: "/coming-soon/apparel", permanent: false },

      // existing review-order redirects
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
