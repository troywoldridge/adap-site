"use client";

import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useState, useMemo, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import SearchBar from "@/components/SearchBar";

const SITE_BRAND = "ADAP";
const SITE_TAGLINE = "Custom Print Experts";
const DEFAULT_DESCRIPTION =
  "Top-class custom printing solutions: business cards, invitations, promotional items, and more. Fast turnaround, dynamic pricing, and professional quality.";
const LOGO_CLOUDFLARE_ID = "a90ba357-76ea-48ed-1c65-44fff4401600";
const LOGO_URL = `https://imagedelivery.net/pJ0fKvjCAbyoF8aD0BGu8Q/${LOGO_CLOUDFLARE_ID}/public`;
const DEFAULT_SOCIAL_SHARE_IMAGE =
  "https://imagedelivery.net/pJ0fKvjCAbyoF8aQ/5b703aad-e904-4d2b-1bf4-13c0fecd2f00/public";

function buildDynamicShareImageUrl(
  primaryImageId?: string,
  productName?: string,
  priceDisplay?: string
): string {
  if (!primaryImageId) {
    return DEFAULT_SOCIAL_SHARE_IMAGE;
  }
  const params = new URLSearchParams();
  params.set("imageId", primaryImageId);
  productName && params.set("title", productName);
  priceDisplay && params.set("price", priceDisplay);
  return `/api/share-image?${params.toString()}`;
}

interface HeaderProps {
  title?: string;
  description?: string;
  ogImage?: string;
  canonicalUrl?: string;
  productName?: string;
  priceDisplay?: string;
  primaryImageId?: string;
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
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();

  const fullTitle = useMemo(
    () => (title ? `${title} | ${SITE_TAGLINE}` : SITE_TAGLINE),
    [title]
  );

  const pagePath = useMemo(() => {
    const base = pathname.startsWith("/") ? pathname : `/${pathname}`;
    const qs = searchParams?.toString();
    return qs ? `${base}?${qs}` : base;
  }, [pathname, searchParams]);

  const computedCanonical = useMemo(() => {
    if (canonicalUrl) {
      return canonicalUrl.replace(/\/+$/, "");
    }
    if (typeof window !== "undefined") {
      return `${window.location.origin}${pagePath}`;
    }
    return pagePath;
  }, [canonicalUrl, pagePath]);

  const computedOgImage = useMemo(() => {
    return ogImage ?? buildDynamicShareImageUrl(
      primaryImageId,
      productName,
      priceDisplay
    );
  }, [ogImage, primaryImageId, productName, priceDisplay]);

  const toggleMenu = useCallback(() => setMenuOpen(o => !o), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <>
      <Head>
        <title>{fullTitle}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={computedCanonical} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_TAGLINE} />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={computedCanonical} />
        {computedOgImage && <meta property="og:image" content={computedOgImage} />}
        {computedOgImage && (
          <meta property="og:image:alt" content={`${SITE_TAGLINE} share image`} />
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
        <meta name="theme-color" content="#c62828" />

        {/* Preconnect & preload */}
        <link rel="preconnect" href="https://imagedelivery.net" crossOrigin="anonymous" />
        {computedOgImage && <link rel="preload" as="image" href={computedOgImage} />}
      </Head>

      <header className="site-header">
        <div className="site-header__inner container">
          {/* Logo / Brand */}
          <Link href="/" onClick={closeMenu} className="site-header__logo" aria-label="Home">
            <Image
              src={LOGO_URL}
              alt={`${SITE_BRAND} logo`}
              width={140}
              height={80}
              priority
              className="site-header__logo-image"
            />
            <div>
              <strong>{SITE_BRAND}</strong>
              <div className="text-xs">{SITE_TAGLINE}</div>
            </div>
          </Link>

          {/* Search */}
          <div className="site-header__search">
            <SearchBar />
          </div>

          {/* Icons & Menu Toggle */}
          <div className="site-header__icons">
            <Link href="/shipping-info" title="Shipping Info">🚚</Link>
            <Link href="/search" title="Search">🔍</Link>
            <Link href="/cart" title="Cart">🛒</Link>
            <Link href="/account" title="Account">👤</Link>
            <button
              className="toggle-btn"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              {menuOpen ? "✕" : "☰"}
            </button>

          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="mobile-menu">
            <nav>
              <Link href="/search" onClick={closeMenu}>🔍 Search</Link>
              <Link href="/cart" onClick={closeMenu}>🛒 Cart</Link>
              <Link href="/account" onClick={closeMenu}>👤 Account</Link>
              <Link href="/shipping-info" onClick={closeMenu}>🚚 Shipping Info</Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
