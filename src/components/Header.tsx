// src/components/Header.tsx
"use client";

import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

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

const CF_ACCOUNT_HASH = process.env.CF_ACCOUNT_HASH || "";
const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || "https://yourdomain.com").replace(/\/+$/, "");
const DEFAULT_SOCIAL_SHARE_IMAGE_ID = process.env.DEFAULT_SOCIAL_SHARE_IMAGE_ID || "";
const LOGO_IMAGE_ID = "a90ba357-76ea-48ed-1c65-44fff4401600";

// helpers
function buildCloudflareImageUrl(imageId: string, variant = "public"): string {
  if (!CF_ACCOUNT_HASH || !imageId) return "";
  return `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${imageId}/${variant}`;
}

function sanitizePath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path.replace(/\/{2,}/g, "/") : `/${path.replace(/\/{2,}/g, "/")}`;
}

function buildDynamicShareImageUrl(
  primaryImageId?: string,
  productName?: string,
  priceDisplay?: string
): string {
  if (!primaryImageId) {
    return buildCloudflareImageUrl(DEFAULT_SOCIAL_SHARE_IMAGE_ID, "social");
  }
  const params = new URLSearchParams();
  params.set("imageId", primaryImageId);
  if (productName) params.set("title", productName);
  if (priceDisplay) params.set("price", priceDisplay);
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
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryString = useMemo(() => {
    if (!searchParams) return "";
    const s = searchParams.toString();
    return s ? `?${s}` : "";
  }, [searchParams]);

  const fullTitle = useMemo(() => (title ? `${title} | ${SITE_NAME}` : SITE_NAME), [title]);
  const pagePath = useMemo(() => sanitizePath(`${pathname || "/"}`) + queryString, [pathname, queryString]);
  const computedCanonical = canonicalUrl
    ? canonicalUrl.replace(/\/+$/, "")
    : `${BASE_URL}${pagePath}`;

  const computedOgImage = useMemo(() => {
    if (ogImage) return ogImage;
    return (
      buildDynamicShareImageUrl(primaryImageId, productName, priceDisplay) ||
      buildCloudflareImageUrl(DEFAULT_SOCIAL_SHARE_IMAGE_ID, "social")
    );
  }, [ogImage, primaryImageId, productName, priceDisplay]);

  const logoUrl = useMemo(() => buildCloudflareImageUrl(LOGO_IMAGE_ID, "public"), []);

  return (
    <>
      <Head>
        <title>{fullTitle}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={computedCanonical} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={computedCanonical} />
        {computedOgImage && <meta property="og:image" content={computedOgImage} />}
        {computedOgImage && (
          <meta property="og:image:alt" content={`${SITE_NAME} share image`} />
        )}
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={fullTitle} />
        <meta name="twitter:description" content={description} />
        {computedOgImage && <meta name="twitter:image" content={computedOgImage} />}

        {/* Favicons & theme */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/webp" href="/adap_favicon.webp" />
        <meta name="theme-color" content="#ffffff" />

        {/* Performance */}
        <link rel="preconnect" href="https://imagedelivery.net" crossOrigin="anonymous" />
        {computedOgImage && <link rel="preload" as="image" href={computedOgImage} />}
      </Head>

      <header className="site-header" aria-label="Main header">
        <div className="container header-content">
          <div className="logo-block">
            <Link href="/" aria-label="Home" className="nav-logo" onClick={() => setMenuOpen(false)}>
              <div className="logo-wrapper">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={`${SITE_NAME} logo`}
                    width={100}
                    height={60}
                    className="logo"
                    priority
                    placeholder="blur"
                    blurDataURL="/placeholder-logo.png"
                    onError={() => {
                      console.warn("Logo image failed to load");
                    }}
                  />
                ) : (
                  <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>{SITE_NAME}</div>
                )}
              </div>
            </Link>
            <div className="site-title">
              <h1 className="header-title">{SITE_NAME}</h1>
              <p className="subtitle">Custom Print Experts</p>
            </div>
          </div>

          <div className="nav-actions">
            <div className="desktop-actions">
              <Link href="/search" aria-label="Search" className="nav-icon">
                <span className="sr-only">Search</span>🔍
              </Link>
              <Link href="/cart" aria-label="Cart" className="nav-icon">
                <span className="sr-only">Cart</span>🛒
              </Link>
              <Link href="/account" aria-label="Account" className="nav-icon">
                <span className="sr-only">Account</span>👤
              </Link>
            </div>
            <button
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              className="hamburger"
              onClick={() => setMenuOpen(o => !o)}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="mobile-menu" role="dialog" aria-label="Expanded menu">
            <div className="mobile-links">
              <Link href="/search" className="nav-icon" onClick={() => setMenuOpen(false)}>
                🔍 Search
              </Link>
              <Link href="/cart" className="nav-icon" onClick={() => setMenuOpen(false)}>
                🛒 Cart
              </Link>
              <Link href="/account" className="nav-icon" onClick={() => setMenuOpen(false)}>
                👤 Account
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
