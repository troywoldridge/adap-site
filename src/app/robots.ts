import type { MetadataRoute } from "next";

/**
 * Robots config with a clean allowlist, sensible disallows,
 * and pointers to BOTH sitemaps.
 */
export default function robots(): MetadataRoute.Robots {
  const site =
    (process.env.NEXT_PUBLIC_SITE_URL || "https://americandesignandprinting.com").replace(
      /\/+$/,
      ""
    );

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // internal + dynamic app bits
          "/_next/",
          "/static/",
          "/api/",
          // user areas / transactional
          "/account",
          "/orders",
          "/cart",
          "/checkout",
          // common admin paths (if you later add admin UI)
          "/admin/",
          "/dashboard/",
        ],
      },
    ],
    // ✅ Register both sitemaps (main + jobs)
    sitemap: [`${site}/sitemap.xml`, `${site}/sitemap-jobs.xml`],
    host: site,
  };
}
