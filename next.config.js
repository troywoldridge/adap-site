/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // turbo: false, // optional: only if needed
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imagedelivery.net",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.sinaliteuppy.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "liveapi.sinalite.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co", // add if you ever use this!
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
