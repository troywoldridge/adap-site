// next.config.js
/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

// Primary inputs
const R2_PUBLIC_BASEURL = process.env.R2_PUBLIC_BASEURL || process.env.R2_PUBLIC_BASE || "";
const R2_DIRECT_HOST = process.env.R2_DIRECT_HOST || ""; // optional
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_BUCKET = process.env.R2_BUCKET || "";
const R2_CDN_HOST = process.env.R2_CDN_HOST || "cdn.adap.com";

// 🔧 You can comma-separate any extra CDN hosts here (e.g. "cdn.adap.com,uploads.adapnow.com")
const EXTRA_CDN_HOSTS = (process.env.EXTRA_CDN_HOSTS || "cdn.adap.com,uploads.adapnow.com")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// ---------- Compute CDN / public origin ----------
const PUBLIC_CDN = R2_PUBLIC_BASEURL || `https://${R2_CDN_HOST}`;

let PUBLIC_CDN_ORIGIN = "";
let PUBLIC_CDN_HOST = "";
let PUBLIC_CDN_PROTOCOL = "";
let PUBLIC_CDN_PORT = "";

try {
  const u = new URL(PUBLIC_CDN);
  PUBLIC_CDN_ORIGIN = u.origin;
  PUBLIC_CDN_HOST = u.hostname;
  PUBLIC_CDN_PROTOCOL = u.protocol.replace(":", "");
  PUBLIC_CDN_PORT = u.port || "";
} catch {}

// ---------- R2 direct/bucket host helpers ----------
const R2_BUCKET_HOST =
  R2_BUCKET && R2_ACCOUNT_ID ? `${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : "";

const R2_DIRECT_HTTPS = R2_DIRECT_HOST ? `https://${R2_DIRECT_HOST}` : "";
const R2_DIRECT_HTTP = R2_DIRECT_HOST ? `http://${R2_DIRECT_HOST}` : "";

// helpers
const sanitize = (arr) =>
  Array.from(new Set(arr.filter(Boolean))).filter((s) => !/^https:\/\/\./.test(s));
const toHttps = (host) => (host.startsWith("http") ? host : `https://${host}`);

// Build a final list of CDN origins we want to allow
const CDN_ORIGINS = sanitize([
  PUBLIC_CDN_ORIGIN,
  ...EXTRA_CDN_HOSTS.map(toHttps), // e.g. https://cdn.adap.com, https://uploads.adapnow.com
  R2_DIRECT_HTTPS,
  R2_DIRECT_HTTP,
  R2_BUCKET_HOST ? `https://${R2_BUCKET_HOST}` : "",
  "https://r2.cloudflarestorage.com",
  "https://*.r2.cloudflarestorage.com",
  "https://*.r2.dev",
]);

// ---------- CSP lists ----------
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
  `https://clerk.accounts.dev`,
  `https://*.clerk.accounts.dev`,
];

const connectSrcList = sanitize([
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
  `https://clerk.accounts.dev`,
  `https://*.clerk.accounts.dev`,
  `https://cdn.jsdelivr.net`,
  ...CDN_ORIGINS,
  isDev ? `ws:` : ``,
  isDev ? `wss:` : ``,
  isDev ? `http://localhost:3000` : ``,
]);

const imgSrcList = sanitize([
  `'self'`,
  `data:`,
  `blob:`,
  `https://imagedelivery.net`,
  `https://api.sinaliteuppy.com`,
  `https://liveapi.sinalite.com`,
  ...CDN_ORIGINS,
  isDev ? `http://localhost:3000` : ``,
]);

// PDFs via <object>/<embed> need media-src
const mediaSrcList = sanitize([
  `'self'`,
  `https:`,
  `data:`,
  `blob:`,
  ...CDN_ORIGINS,
]);

const frameSrcList = sanitize([
  `https://js.stripe.com`,
  `https://hooks.stripe.com`,
  `https://pay.google.com`,
  `https://clerk.com`,
  `https://clerk.dev`,
  `https://clerk.accounts.dev`,
  `https://*.clerk.accounts.dev`,
  `https://challenges.cloudflare.com`,
]);

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
  "media-src": mediaSrcList.join(" "),
  "worker-src": `'self' blob:`,
  "connect-src": connectSrcList.join(" "),
  "frame-src": frameSrcList.join(" "),
  "object-src": `'none'`,
  "base-uri": `'self'`,
  "form-action": `'self' https://api.stripe.com`,
  "frame-ancestors": `'none'`,
};

const ContentSecurityPolicy = Object.entries(directives)
  .map(([k, v]) => `${k} ${v}`)
  .join("; ");

// Dev-only debug header so you can verify img-src at a glance
const debugHeaders = isDev
  ? [{ key: "x-debug-img-src", value: imgSrcList.join(" | ") }]
  : [];

const securityHeaders = [
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  ...debugHeaders,
];

// ---------- next/image remotePatterns ----------
const imageRemotePatterns = [
  { protocol: "https", hostname: "imagedelivery.net", pathname: "/**" },
  { protocol: "https", hostname: "api.sinaliteuppy.com", pathname: "/**" },
  { protocol: "https", hostname: "liveapi.sinalite.com", pathname: "/**" },
  { protocol: "https", hostname: "r2.cloudflarestorage.com", pathname: "/**" },
];

// Add your public CDN host
if (PUBLIC_CDN_HOST) {
  imageRemotePatterns.push(
    PUBLIC_CDN_PORT
      ? {
          protocol: PUBLIC_CDN_PROTOCOL || "https",
          hostname: PUBLIC_CDN_HOST,
          port: PUBLIC_CDN_PORT,
          pathname: "/**",
        }
      : {
          protocol: PUBLIC_CDN_PROTOCOL || "https",
          hostname: PUBLIC_CDN_HOST,
          pathname: "/**",
        }
  );
}

// Add extra CDN hosts explicitly (e.g. cdn.adap.com, uploads.adapnow.com)
for (const host of EXTRA_CDN_HOSTS) {
  imageRemotePatterns.push({ protocol: "https", hostname: host, pathname: "/**" });
}

// R2 bucket subdomain
if (R2_BUCKET_HOST) {
  imageRemotePatterns.push({ protocol: "https", hostname: R2_BUCKET_HOST, pathname: "/**" });
}

// Direct host
if (R2_DIRECT_HOST) {
  imageRemotePatterns.push({ protocol: "https", hostname: R2_DIRECT_HOST, pathname: "/**" });
  imageRemotePatterns.push({ protocol: "http", hostname: R2_DIRECT_HOST, pathname: "/**" });
}

// Local dev
if (isDev) {
  imageRemotePatterns.push({
    protocol: "http",
    hostname: "localhost",
    port: "3000",
    pathname: "/**",
  });
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: imageRemotePatterns,
    // If you already let Cloudflare/R2 serve optimized images, keep unoptimized true.
    // Otherwise set to false to use Next's optimizer.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/category/promotional", destination: "/coming-soon/promotional", permanent: false },
      { source: "/category/promotional/:path*", destination: "/coming-soon/promotional", permanent: false },
      { source: "/category/apparel", destination: "/coming-soon/apparel", permanent: false },
      { source: "/category/apparel/:path*", destination: "/coming-soon/apparel", permanent: false },
      { source: "/category/apperal", destination: "/coming-soon/apparel", permanent: false },
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
