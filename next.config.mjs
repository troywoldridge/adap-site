// next.config.mjs
/** @type {import('next').NextConfig} */
import path from "node:path";

const isDev = process.env.NODE_ENV !== "production";

/* ===================== Inputs (support server + client envs) ===================== */
const R2_PUBLIC_BASEURL =
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASEURL ||
  process.env.R2_PUBLIC_BASE_URL ||
  process.env.R2_PUBLIC_BASEURL ||
  "";

const R2_DIRECT_HOST = process.env.R2_DIRECT_HOST || "";
const R2_ACCOUNT_ID  = process.env.R2_ACCOUNT_ID  || "";
const R2_BUCKET      = process.env.R2_BUCKET      || "";
const R2_CDN_HOST    = process.env.R2_CDN_HOST    || "cdn.adap.com"; // hard default
const USE_NEXT_IMAGE_OPTIMIZER = process.env.USE_NEXT_IMAGE_OPTIMIZER !== "false";

/* ===================== Compute CDN target ===================== */
// Prefer explicit public base (may include a path like /artwork), else fallback to host.
const PUBLIC_CDN = R2_PUBLIC_BASEURL || `https://${R2_CDN_HOST}`;

let PUBLIC_CDN_ORIGIN = "";
let PUBLIC_CDN_HOST   = "";
let PUBLIC_CDN_PROTOCOL = "";
let PUBLIC_CDN_PORT   = "";

try {
  const u = new URL(PUBLIC_CDN);
  PUBLIC_CDN_ORIGIN   = u.origin;             // e.g. https://cdn.adap.com
  PUBLIC_CDN_HOST     = u.hostname;           // e.g. cdn.adap.com
  PUBLIC_CDN_PROTOCOL = u.protocol.replace(":", "");
  PUBLIC_CDN_PORT     = u.port || "";
} catch { /* noop */ }

// R2 helpers
const R2_BUCKET_HOST =
  R2_BUCKET && R2_ACCOUNT_ID ? `${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : "";

const R2_DIRECT_HTTPS = R2_DIRECT_HOST ? `https://${R2_DIRECT_HOST}` : "";
const R2_DIRECT_HTTP  = R2_DIRECT_HOST ? `http://${R2_DIRECT_HOST}` : "";

/* ===================== Helpers ===================== */
const sanitize = (arr) =>
  Array.from(new Set(arr.filter(Boolean))).filter((s) => !/^https:\/\/\./.test(s));

// Strip non-ASCII + control chars from header values (HTTP/1.1)
function asciiSafe(s) {
  return String(s).replace(/[^\x20-\x7E]+/g, "");
}

/* ===================== CSP lists ===================== */
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
  // R2 endpoints
  `https://r2.cloudflarestorage.com`,
  `https://*.r2.cloudflarestorage.com`,
  R2_BUCKET_HOST ? `https://${R2_BUCKET_HOST}` : "",
  PUBLIC_CDN_ORIGIN,     // ✅ your CDN origin (e.g., https://cdn.adap.com)
  R2_DIRECT_HTTPS,
  R2_DIRECT_HTTP,
  `https://clerk-telemetry.com`,
  isDev ? `ws:` : ``,
  isDev ? `wss:` : ``,
  isDev ? `http://localhost:3000` : ``,
]);

const imgSrcList = sanitize([
  `'self'`,
  `data:`,
  `blob:`,
  `https://imagedelivery.net`, // Cloudflare Images (CDN)
  `https://img.clerk.com`,
  `https://api.sinaliteuppy.com`,
  `https://liveapi.sinalite.com`,
  // R2 public reads
  `https://r2.cloudflarestorage.com`,
  `https://*.r2.cloudflarestorage.com`,
  `https://*.r2.dev`,
  `https://${R2_CDN_HOST}`,  // ✅ explicit host fallback
  PUBLIC_CDN_ORIGIN,        // ✅ derived origin from NEXT_PUBLIC_R2_PUBLIC_BASE_URL (handles /artwork)
  R2_DIRECT_HTTPS,
  R2_DIRECT_HTTP,
  isDev ? `http://localhost:3000` : ``,
]);

const mediaSrcList = sanitize([
  `'self'`,
  `https:`,
  `data:`,
  `blob:`,
  `https://${R2_CDN_HOST}`,
  PUBLIC_CDN_ORIGIN,
  R2_DIRECT_HTTPS,
  R2_DIRECT_HTTP,
]);

const frameSrcList = sanitize([
  `https://js.stripe.com`,
  `https://hooks.stripe.com`,
  `https://pay.google.com`,
  `https://accounts.google.com`,
  `https://*.google.com`,
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
  "manifest-src": `'self'`,
};

const ContentSecurityPolicy = Object.entries(directives)
  .map(([k, v]) => `${k} ${v}`)
  .join("; ");

// ---------- DEV LOGGING ----------
if (isDev) {
  const logRows = Object.entries(directives).map(([k, v]) => ({ directive: k, value: v }));
  console.log("\n🔐 CSP (dev) — effective directives");
  console.table(logRows);
  console.log("CSP (dev) — full string:\n", ContentSecurityPolicy, "\n");
}

const preview = asciiSafe(
  ContentSecurityPolicy.length > 256
    ? ContentSecurityPolicy.slice(0, 256) + "..."
    : ContentSecurityPolicy
);

const securityHeaders = [
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
  ...(isDev ? [{ key: "Content-Security-Policy-Report-Only", value: ContentSecurityPolicy }] : []),
  ...(isDev ? [{ key: "X-CSP-Preview", value: preview }] : []),
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/* ===================== next/image remotePatterns ===================== */
const imageRemotePatterns = [
  { protocol: "https", hostname: "imagedelivery.net", pathname: "/**" }, // Cloudflare Images
  { protocol: "https", hostname: "api.sinaliteuppy.com", pathname: "/**" },
  { protocol: "https", hostname: "liveapi.sinalite.com", pathname: "/**" },
  { protocol: "https", hostname: "r2.cloudflarestorage.com", pathname: "/**" },
  { protocol: "https", hostname: "cdn.adap.com", pathname: "/**" },      // hard default
];

if (PUBLIC_CDN_HOST) {
  imageRemotePatterns.push(
    PUBLIC_CDN_PORT
      ? { protocol: PUBLIC_CDN_PROTOCOL || "https", hostname: PUBLIC_CDN_HOST, port: PUBLIC_CDN_PORT, pathname: "/**" }
      : { protocol: PUBLIC_CDN_PROTOCOL || "https", hostname: PUBLIC_CDN_HOST, pathname: "/**" }
  );
}

if (R2_BUCKET_HOST) {
  imageRemotePatterns.push({ protocol: "https", hostname: R2_BUCKET_HOST, pathname: "/**" });
}

if (R2_DIRECT_HOST) {
  imageRemotePatterns.push({ protocol: "https", hostname: R2_DIRECT_HOST, pathname: "/**" });
  imageRemotePatterns.push({ protocol: "http",  hostname: R2_DIRECT_HOST, pathname: "/**" });
}

if (isDev) {
  imageRemotePatterns.push({ protocol: "http", hostname: "localhost", port: "3000", pathname: "/**" });
}

const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pg", "pg-connection-string", "pg-pool"],
  outputFileTracingRoot: path.join(process.cwd()),

  images: {
    remotePatterns: imageRemotePatterns,
    // Cloudflare Images is our CDN—skip Next optimizer if you want pure variant delivery
    unoptimized: !USE_NEXT_IMAGE_OPTIMIZER,
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
      { source: "/category/apperal", destination: "/coming-soon/apparel", permanent: false }, // typo fix
      { source: "/review-order", destination: "/cart/review", permanent: true },
      { source: "/revieworder",  destination: "/cart/review", permanent: true },
      { source: "/order/review", destination: "/cart/review", permanent: true },
    ];
  },
};

export default nextConfig;
