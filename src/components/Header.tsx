// src/components/Header.tsx
"use client";

import "@/globals.css";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import SearchBar from "@/components/SearchBar"; // your Algolia search bar component

interface HeaderProps {
  title?: string;
  description?: string;
  ogImage?: string;
  canonicalUrl?: string;
  productName?: string;
  priceDisplay?: string;
  primaryImageId?: string;
}

const SITE_BRAND = "ADAP";
const SITE_TAGLINE = "Custom Print Experts";
const DEFAULT_DESCRIPTION =
  "Top-class custom printing solutions: business cards, invitations, promotional items, and more. Fast turnaround, dynamic pricing, and professional quality.";

// Hardcoded logo image (Cloudflare)
const LOGO_URL =
  "https://imagedelivery.net/pJ0fKvjCAbyoF8aD0BGu8Q/a90ba357-76ea-48ed-1c65-44fff4401600/public";
// Fallback share image
const DEFAULT_SOCIAL_SHARE_IMAGE =
  "https://imagedelivery.net/pJ0fKvjCAbyoF8aQ/5b703aad-e904-4d2b-1bf4-13c0fecd2f00/public";

const buildDynamicShareImageUrl = (
  primaryImageId?: string,
  productName?: string,
  priceDisplay?: string
): string => {
  if (!primaryImageId) return DEFAULT_SOCIAL_SHARE_IMAGE;
  const params = new URLSearchParams();
  params.set("imageId", primaryImageId);
  if (productName) params.set("title", productName);
  if (priceDisplay) params.set("price", priceDisplay);
  return `/api/share-image?${params.toString()}`;
};

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
    const clean = pathname.startsWith("/") ? pathname : `/${pathname}`;
    const qs = searchParams?.toString();
    return qs ? `${clean}?${qs}` : clean;
  }, [pathname, searchParams]);

  const computedCanonical = useMemo(() => {
    if (canonicalUrl) return canonicalUrl.replace(/\/+$/, "");
    if (typeof window !== "undefined") {
      return `${window.location.origin}${pagePath}`;
    }
    return pagePath;
  }, [canonicalUrl, pagePath]);

  const computedOgImage = useMemo(() => {
    if (ogImage) return ogImage;
    return buildDynamicShareImageUrl(primaryImageId, productName, priceDisplay);
  }, [ogImage, primaryImageId, productName, priceDisplay]);

  const toggleMenu = useCallback(() => setMenuOpen((o) => !o), []);
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

        {/* Preconnect / preload */}
        <link rel="preconnect" href="https://imagedelivery.net" crossOrigin="anonymous" />
        {computedOgImage && <link rel="preload" as="image" href={computedOgImage} />}
      </Head>

      <header
        className="site-header"
        aria-label="Main header"
        style={{
          background: "#c62828",
          color: "white",
          borderBottom: "2px solid #1f3f7a",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          className="container header-content"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "8px 0",
            position: "relative",
            flexWrap: "nowrap",
          }}
        >
          {/* logo + brand */}
          <Link
            href="/"
            aria-label="Home"
            onClick={closeMenu}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              textDecoration: "none",
              flexShrink: 0,
              color: "white",
            }}
          >
            <div
              className="logo-wrapper"
              style={{
                position: "relative",
                width: 140,
                height: 84,
                flexShrink: 0,
              }}
            >
              <Image
                src={LOGO_URL}
                alt={`${SITE_BRAND} logo`}
                fill
                sizes="140px"
                priority
                style={{ objectFit: "contain" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span style={{ fontWeight: 700, fontSize: "1.25rem" }}>{SITE_BRAND}</span>
              <span style={{ fontSize: "0.65rem", marginTop: 2 }}>{SITE_TAGLINE}</span>
            </div>
          </Link>

          {/* spacer */}
          <div style={{ flex: 1, minWidth: 120 }} />

          {/* Algolia search bar component */}
          <div style={{ flex: "0 1 300px", marginRight: 16 }}>
            <SearchBar />
          </div>

          {/* action icons */}
          <div
            className="nav-actions"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 0,
            }}
          >
            <Link
              href="/shipping-info"
              aria-label="Shipping Info"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "8px 12px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.15)",
                textDecoration: "none",
                color: "white",
                fontSize: "0.85rem",
              }}
            >
              🚚 Shipping Info
            </Link>
            <Link
              href="#"
              aria-label="Instagram"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.15)",
                textDecoration: "none",
                color: "white",
                fontSize: "1rem",
              }}
            >
              📸
            </Link>
            <Link
              href="#"
              aria-label="Twitter"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.15)",
                textDecoration: "none",
                color: "white",
                fontSize: "1rem",
              }}
            >
              🐦
            </Link>
            <Link
              href="/search"
              aria-label="Search"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.15)",
                textDecoration: "none",
                color: "white",
                fontSize: "1rem",
              }}
            >
              🔍
            </Link>
            <Link
              href="/cart"
              aria-label="Cart"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.15)",
                textDecoration: "none",
                color: "white",
                fontSize: "1rem",
              }}
            >
              🛒
            </Link>
            <Link
              href="/account"
              aria-label="Account"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.15)",
                textDecoration: "none",
                color: "white",
                fontSize: "1rem",
              }}
            >
              👤
            </Link>
            <button
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              onClick={toggleMenu}
              type="button"
              style={{
                background: "none",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 6,
                padding: "8px 12px",
                cursor: "pointer",
                color: "white",
                fontSize: "1rem",
              }}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* mobile menu */}
        {menuOpen && (
          <div
            role="dialog"
            aria-label="Expanded menu"
            style={{
              background: "#ffe5e5",
              padding: "1rem 1.25rem",
              borderTop: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            }}
          >
            <div
              className="mobile-links"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                maxWidth: 600,
                margin: "0 auto",
              }}
            >
              <Link href="/search" onClick={closeMenu} style={{ textDecoration: "none" }}>
                🔍 Search
              </Link>
              <Link href="/cart" onClick={closeMenu} style={{ textDecoration: "none" }}>
                🛒 Cart
              </Link>
              <Link href="/account" onClick={closeMenu} style={{ textDecoration: "none" }}>
                👤 Account
              </Link>
              <Link
                href="/shipping-info"
                onClick={closeMenu}
                style={{ textDecoration: "none" }}
              >
                🚚 Shipping Info
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
