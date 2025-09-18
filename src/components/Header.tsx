// src/components/Header.tsx
"use client";

import Head from "next/head";
import Image from "@/components/ImageSafe";
import Link from "next/link";
import { useState, useMemo, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import { useCart } from "@/hooks/useCart";
import HeaderAuth from "@/components/HeaderAuth";

// Brand / content
const SITE_BRAND = "ADAP";
const SITE_TAGLINE = "Custom Print Experts";
const DEFAULT_DESCRIPTION =
  "Top-class custom printing solutions: business cards, invitations, promotional items, and more. Fast turnaround, dynamic pricing, and professional quality.";

// Cloudflare Images
const CF_HASH = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH ?? "pJ0fKvjCAbyoF8aD0BGu8Q";
const DEFAULT_LOGO_ID = "a90ba357-76ea-48ed-1c65-44fff4401600";
const LOGO_ID = process.env.NEXT_PUBLIC_CF_LOGO_ID ?? DEFAULT_LOGO_ID;
const LOGO_URL = `https://imagedelivery.net/${CF_HASH}/${LOGO_ID}/public`;

// Social share
const DEFAULT_SOCIAL_IMAGE_ID = "a90ba357-76ea-48ed-1c65-44fff4401600";
const DEFAULT_SOCIAL_SHARE_IMAGE = `https://imagedelivery.net/${CF_HASH}/${DEFAULT_SOCIAL_IMAGE_ID}/public`;

function buildDynamicShareImageUrl(
  primaryImageId?: string,
  productName?: string,
  priceDisplay?: string
): string {
  if (!primaryImageId) return DEFAULT_SOCIAL_SHARE_IMAGE;
  const params = new URLSearchParams();
  params.set("imageId", primaryImageId);
  if (productName) params.set("title", productName);
  if (priceDisplay) params.set("price", priceDisplay);
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
  const { itemCount } = useCart();

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
    if (canonicalUrl) return canonicalUrl.replace(/\/+$/, "");
    if (typeof window !== "undefined") return `${window.location.origin}${pagePath}`;
    return pagePath;
  }, [canonicalUrl, pagePath]);

  const computedOgImage = useMemo(() => {
    return ogImage ?? buildDynamicShareImageUrl(primaryImageId, productName, priceDisplay);
  }, [ogImage, primaryImageId, productName, priceDisplay]);

  const toggleMenu = useCallback(() => setMenuOpen((o) => !o), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <>
      {/* Meta */}
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
        <meta name="theme-color" content="#0f172a" />

        {/* Preconnect */}
        <link rel="preconnect" href="https://imagedelivery.net" crossOrigin="anonymous" />
      </Head>

      {/* Sticky header */}
      <header className="relative border-b bg-white">

        {/* Row 1: Brand + Search + Icons */}
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          {/* Logo / Brand */}
          <Link
            href="/"
            onClick={closeMenu}
            className="group inline-flex items-center gap-3"
            aria-label="Home"
          >
            <Image
              src={LOGO_URL}
              alt={`${SITE_BRAND} logo`}
              width={56}
              height={56}
              priority
              className="h-12 w-12 rounded-md bg-white object-contain ring-1 ring-gray-200 transition group-hover:ring-blue-600"
            />
            <div className="leading-tight">
              <div className="text-lg font-bold tracking-tight text-gray-900 group-hover:text-blue-700">
                {SITE_BRAND}
              </div>
              <div className="text-xs text-gray-500">{SITE_TAGLINE}</div>
            </div>
          </Link>

          {/* Search (hidden on small screens) */}
          <div className="hidden min-w-0 flex-1 md:block">
            <div className="mx-auto max-w-xl">
              <SearchBar />
            </div>
          </div>

          {/* Icons */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              title="Home"
              className="rounded-lg p-2 text-xl hover:bg-gray-100"
              aria-label="Home"
            >
              🏠
            </Link>
            <Link
              href="/shipping-info"
              title="Shipping Info"
              className="rounded-lg p-2 text-xl hover:bg-gray-100"
              aria-label="Shipping Info"
            >
              🚚
            </Link>
            <Link
              href="/search"
              title="Search"
              className="rounded-lg p-2 text-xl hover:bg-gray-100 md:hidden"
              aria-label="Search"
            >
              🔍
            </Link>
            <Link
              href="/cart"
              title="Cart"
              className="relative rounded-lg p-2 text-xl hover:bg-gray-100"
              aria-label="Cart"
            >
              🛒
              {itemCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 inline-flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold leading-none text-white"
                >
                  {itemCount}
                </span>
              )}
            </Link>
            <Link
              href="/account"
              title="Account"
              className="rounded-lg p-2 text-xl hover:bg-gray-100"
              aria-label="Account"
            >
              👤
            </Link>
             <HeaderAuth />

            {/* Mobile menu toggle */}
            <button
              className="ml-1 rounded-lg p-2 text-xl hover:bg-gray-100 md:hidden"
              onClick={toggleMenu}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Row 2 (desktop): Categories evenly spaced (one row) */}
<nav className="hidden border-t border-gray-200 bg-white md:block" aria-label="Category quick links">
  <div className="mx-auto max-w-7xl px-4">
    <ul className="grid grid-flow-col auto-cols-fr w-full items-stretch text-sm">
      <li className="flex">
        <Link className="flex-1 py-2 text-center hover:text-blue-700 whitespace-nowrap" href="/categories">
          Categories
        </Link>
      </li>
      <li className="flex">
        <Link className="flex-1 py-2 text-center hover:text-blue-700 whitespace-nowrap" href="/category/business-cards">
          Business Cards
        </Link>
      </li>
      <li className="flex">
        <Link className="flex-1 py-2 text-center hover:text-blue-700 whitespace-nowrap" href="/category/print-products">
          Print Products
        </Link>
      </li>
      <li className="flex">
        <Link className="flex-1 py-2 text-center hover:text-blue-700 whitespace-nowrap" href="/category/large-format">
          Large Format
        </Link>
      </li>
      <li className="flex">
        <Link className="flex-1 py-2 text-center hover:text-blue-700 whitespace-nowrap" href="/category/labels-and-packaging">
          Labels &amp; Packaging
        </Link>
      </li>
      <li className="flex">
        <Link className="flex-1 py-2 text-center hover:text-blue-700 whitespace-nowrap" href="/category/apparel">
          Apparel
        </Link>
      </li>
      <li className="flex">
        <Link className="flex-1 py-2 text-center hover:text-blue-700 whitespace-nowrap" href="/category/sample-kits">
          Sample Kits
        </Link>
      </li>
    </ul>
  </div>
</nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div id="mobile-menu" className="border-t border-gray-200 bg-white md:hidden">
            <div className="mx-auto max-w-7xl px-4 py-3">
              <div className="mb-3">
                <SearchBar />
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Link href="/" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-gray-50">
                  🏠 Home
                </Link>
                <Link href="/search" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-gray-50">
                  🔍 Search
                </Link>
                <Link href="/cart" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-gray-50">
                  🛒 Cart{itemCount > 0 ? ` (${itemCount})` : ""}
                </Link>
                <Link href="/account" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-gray-50">
                  👤 Account
                </Link>
                <Link href="/shipping-info" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-gray-50">
                  🚚 Shipping Info
                </Link>
              </div>

              {/* Categories — full width, evenly spaced */}
              <div className="mt-3 flex w-full justify-evenly text-sm">
                <Link href="/category/business-cards" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-gray-50">
                  Business Cards
                </Link>
                <Link href="/category/print-products" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-gray-50">
                  Print Products
                </Link>
                <Link href="/category/large-format" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-gray-50">
                  Large Format
                </Link>
                <Link href="/category/labels-and-packaging" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-gray-50">
                  Labels &amp; Packaging
                </Link>
                <Link href="/category/apparel" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-gray-50">
                  Apparel
                </Link>
                <Link href="/category/sample-kits" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-gray-50">
                  Sample Kits
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
