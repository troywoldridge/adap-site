/** @type {import('next').NextConfig} */
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://imagedelivery.net https://api.sinaliteuppy.com https://liveapi.sinalite.com https://placehold.co;
  font-src 'self' data:;
  connect-src 'self' https://api.stripe.com https://liveapi.sinalite.com https://api.sinaliteuppy.com https://*.upstash.io;
  frame-src https://js.stripe.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
`;

const securityHeaders = [
  { key: "Content-Security-Policy", value: ContentSecurityPolicy.replace(/\n/g, " ").trim() },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // turbo: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "imagedelivery.net", port: "", pathname: "/**" }, // Cloudflare Image Delivery
      { protocol: "https", hostname: "api.sinaliteuppy.com", port: "", pathname: "/**" },
      { protocol: "https", hostname: "liveapi.sinalite.com", port: "", pathname: "/**" },
      { protocol: "https", hostname: "placehold.co", port: "", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
