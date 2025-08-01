// src/components/Header.tsx
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface HeaderProps {
  title?: string;
  description?: string;
  ogImage?: string;
  canonicalUrl?: string;
  productName?: string;
  priceDisplay?: string;
  primaryImageId?: string;
}

const SITE_NAME = "Custom Print Experts";
const DEFAULT_DESCRIPTION =
  "Top-class custom printing solutions: business cards, invitations, promotional items, and more. Fast turnaround, dynamic pricing, and professional quality.";

const {CF_ACCOUNT_HASH} = process.env;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://yourdomain.com";
const {DEFAULT_SOCIAL_SHARE_IMAGE_ID} = process.env;
const LOGO_IMAGE_ID = "a90ba357-76ea-48ed-1c65-44fff4401600"; // provided logo ID

// Build Cloudflare Image URL helper
function buildCloudflareImageUrl(imageId: string, variant = "public") {
  if (!CF_ACCOUNT_HASH || !imageId) {
    return "";
  }
  return `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${imageId}/${variant}`;
}

// Compose dynamic share image endpoint (you need to implement /api/share-image)
function dynamicShareImageUrl(
  primaryImageId?: string,
  productName?: string,
  priceDisplay?: string
): string {
  if (!primaryImageId) {
    return buildCloudflareImageUrl(DEFAULT_SOCIAL_SHARE_IMAGE_ID || "", "social");
  }
  const params = new URLSearchParams();
  params.set("imageId", primaryImageId);
  if (productName) {
    params.set("title", productName);
  }
  if (priceDisplay) {
    params.set("price", priceDisplay);
  }
  return `${BASE_URL}/api/share-image?${params.toString()}`;
}

export default function Header({
  title,
  description = DEFAULT_DESCRIPTION,
  ogImage,
  canonicalUrl,
  productName,
  priceDisplay,
  primaryImageId,
}: HeaderProps) {
  const router = useRouter();
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const pageUrl = canonicalUrl ?? `${BASE_URL}${router.asPath}`;

  const computedOgImage =
    ogImage ||
    dynamicShareImageUrl(primaryImageId, productName, priceDisplay) ||
    buildCloudflareImageUrl(DEFAULT_SOCIAL_SHARE_IMAGE_ID || "", "social");

  return (
    <>
      <Head>
        {/* Basic SEO */}
        <title>{fullTitle}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={pageUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={computedOgImage} />
        <meta property="og:image:alt" content={`${SITE_NAME} share image`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={fullTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={computedOgImage} />

        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/webp" href="/adap_favicon.webp" />
        <meta name="theme-color" content="#ffffff" />

        {/* Performance */}
        <link rel="preconnect" href="https://imagedelivery.net" crossOrigin="anonymous" />

        {/* Structured data */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: SITE_NAME,
              url: BASE_URL,
              logo: buildCloudflareImageUrl(LOGO_IMAGE_ID, "public"),
              sameAs: [],
              contactPoint: [
                {
                  "@type": "ContactPoint",
                  telephone: "+1-800-000-0000",
                  contactType: "customer support",
                  areaServed: "US",
                  availableLanguage: ["English"],
                },
              ],
            }),
          }}
        />
      </Head>

      <header className="site-header flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Home">
            <div className="relative w-[100px] h-[60px] flex-shrink-0">
              <Image
                src={buildCloudflareImageUrl(LOGO_IMAGE_ID, "public")}
                alt="ADAP Logo"
                fill
                sizes="(max-width: 640px) 80px, 100px"
                priority
                className="object-contain"
                placeholder="blur"
                blurDataURL="/placeholder-logo.png"
              />
            </div>
          </Link>
          <div className="hidden sm:block">
            <h1 className="text-xl font-semibold leading-tight m-0">{SITE_NAME}</h1>
            <p className="text-sm text-gray-600 m-0">Custom Print Experts</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/search" aria-label="Search">
            <span className="sr-only">Search</span>
            🔍
          </Link>
          <Link href="/cart" aria-label="Cart">
            <span className="sr-only">Cart</span>
            🛒
          </Link>
          <Link href="/account" aria-label="Account">
            <span className="sr-only">Account</span>
            👤
          </Link>
        </div>
      </header>
    </>
  );
}
