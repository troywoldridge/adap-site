// src/lib/seo.ts
import type { Metadata } from "next";
import { cfUrl } from "@/lib/data";

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "http://localhost:3000";
const STORE = process.env.NEXT_PUBLIC_STORE_CODE || "en_us";
const CURRENCY = STORE.toLowerCase().includes("us") ? "USD" : "CAD";

export function absoluteUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE}${p}`;
}

export function baseMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE),
    alternates: { canonical: SITE },
    openGraph: {
      siteName: "ADAP Print",
      type: "website",
      locale: "en_US",
      url: SITE,
    },
    twitter: { card: "summary_large_image" },
  };
}

/** Organization + Website JSON-LD */
export function orgAndSiteJsonLd() {
  const ogId = process.env.DEFAULT_SOCIAL_SHARE_IMAGE_ID; // may be undefined
  // Prefer Cloudflare Images URL; fall back to a local absolute logo (make sure it exists)
  const fallbackLogo = `${SITE}/favicon-32x32.png`;
  const logoUrl = ogId ? cfUrl(ogId) : fallbackLogo;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE}#org`,
        "name": "ADAP Print",
        "url": SITE,
        // JSON.stringify drops undefined, but we provide a string either way
        "logo": logoUrl,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE}#website`,
        "url": SITE,
        "name": "ADAP Print",
        "publisher": { "@id": `${SITE}#org` },
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${SITE}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      }
    ]
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((it, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "name": it.name,
      "item": it.url
    }))
  };
}

export function productJsonLd(opts: {
  id: string | number;
  name: string;
  description?: string | null;
  images: string[];
  sku?: string | null;
  brand?: string;
  url: string;
  category?: string;
  offer?: { price: number; currency?: string; availability?: string } | null;
}) {
  const availability = opts.offer?.availability || "https://schema.org/InStock";
  const currency = opts.offer?.currency || CURRENCY;

  const json: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${opts.url}#product`,
    "name": opts.name,
    "description": opts.description || "",
    "image": opts.images.length ? opts.images : undefined,
    "sku": opts.sku || undefined,
    "brand": opts.brand ? { "@type": "Brand", "name": opts.brand } : undefined,
    "category": opts.category || undefined,
    "url": opts.url,
  };

  if (opts.offer?.price && Number.isFinite(opts.offer.price)) {
    json.offers = {
      "@type": "Offer",
      "price": opts.offer.price,
      "priceCurrency": currency,
      "availability": availability,
      "url": opts.url,
    };
  }

  return json;
}
