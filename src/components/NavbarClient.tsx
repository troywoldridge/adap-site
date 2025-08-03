"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaBars, FaTimes, FaHome, FaTags } from "react-icons/fa";
import type { NavCat } from "@/lib/queries/getNavbarData";

interface SubCat {
  slug: string;
  name: string;
  // add products if returned from backend in future
  products?: { slug: string; name: string; image?: string }[];
}
interface NavCatMega extends NavCat {
  imageUrl?: string;    // Optional: Hardcode here or fetch from DB
  description?: string; // Optional: Hardcode here or fetch from DB
  subcategories?: SubCat[];
}

interface Props {
  navItems?: NavCatMega[];
}

type FetchState = {
  data?: NavCatMega[];
  loading: boolean;
  error?: string;
};

function formatName(name: string) {
  // Remove underscores and capitalize nicely
  return name
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1));
}

export default function NavbarClient({ navItems: initialNavItems }: Props) {
  const [open, setOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState<string | null>(null); // which cat menu is open
  const [fetchState, setFetchState] = useState<FetchState>({
    data: initialNavItems,
    loading: !initialNavItems,
    error: undefined,
  });
  const path = usePathname() || "/";
  const navRef = useRef<HTMLElement | null>(null);

  // For demo: hardcode category images/descriptions here (by slug)
  const categoryMeta: Record<string, { image: string; desc: string }> = {
    "stationery": {
      image: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=400&q=80",
      desc: "Business cards, envelopes, and everything you need to get your brand noticed."
    },
    "large-format": {
      image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?w=400&q=80",
      desc: "Go big with banners, posters, signs, and more. Quality at scale."
    },
    // Add more or fetch from DB/API if you want!
  };

  // isActive link highlighting
  const isActive = useCallback(
    (href: string) => {
      if (!href) return false;
      if (href === "/") return path === "/";
      return path === href || path.startsWith(href + "/");
    },
    [path]
  );

  const categories: NavCatMega[] = (fetchState.data || []).map((cat) => ({
    ...cat,
    ...categoryMeta[cat.slug], // add image/desc if present
    subcategories: cat.subcategories?.map((sub) => ({
      ...sub,
      name: formatName(sub.name),
    })),
  }));

  // Fetch nav items from API if not statically passed in (fallback)
  useEffect(() => {
    if (initialNavItems) return;
    let cancelled = false;
    setFetchState((s) => ({ ...s, loading: true, error: undefined }));
    fetch("/api/navbar")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load navbar: ${res.statusText}`);
        const payload = await res.json();
        if (!cancelled) setFetchState({ data: payload.navItems || [], loading: false });
      })
      .catch((err) => {
        if (!cancelled) setFetchState({ data: [], loading: false, error: err.message || "Failed to load" });
      });
    return () => { cancelled = true; };
  }, [initialNavItems]);

  // Menu/mega-menu interactions
  const closeMenus = () => {
    setOpen(false);
    setMegaOpen(null);
  };

  // Mobile/escape/outside click closing
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (open && navRef.current && !navRef.current.contains(e.target as Node)) closeMenus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenus();
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Mobile nav: close on desktop resize
  useEffect(() => {
    let timeout: number | null = null;
    const onResize = () => {
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        if (window.innerWidth > 900 && open) closeMenus();
      }, 120);
    };
    window.addEventListener("resize", onResize);
    return () => {
      if (timeout) window.clearTimeout(timeout);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  // Auto-columns logic for mega menu: 4 columns max, balance if more than 8 subcats
  function splitIntoColumns<T>(items: T[], maxCols = 4): T[][] {
    if (!items.length) return [];
    const perCol = Math.ceil(items.length / maxCols);
    return Array.from({ length: maxCols }, (_, i) =>
      items.slice(i * perCol, (i + 1) * perCol)
    ).filter((col) => col.length);
  }

  const handleLinkClick = () => closeMenus();

  return (
    <header className="navbar" ref={navRef}>
      <div className="navbar-container">
        {/* Brand/logo */}
        <Link href="/" className="nav-logo" onClick={handleLinkClick}>
          <FaHome aria-hidden="true" style={{ marginRight: 6 }} /> ADAP
        </Link>
        {/* Mobile hamburger */}
        <button
          className="hamburger"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="main-navigation"
          type="button"
        >
          {open ? <FaTimes aria-hidden="true" /> : <FaBars aria-hidden="true" />}
        </button>

        {/* Nav links */}
        <nav
          id="main-navigation"
          className={`nav-links${open ? " open" : ""}`}
          aria-label="Main navigation"
        >
          {fetchState.loading ? (
            <div className="nav-loading">Loading...</div>
          ) : fetchState.error ? (
            <div className="nav-error">Error loading menu</div>
          ) : (
            <ul className="nav-menu" role="menubar">
              {categories.length > 0 ? (
                categories.map((cat) => {
                  const hasSub = cat.subcategories && cat.subcategories.length > 0;
                  return (
                    <li
                      key={cat.slug}
                      className="nav-item"
                      role="none"
                      // Desktop mega: open on hover, mobile on click
                      onMouseEnter={() => setMegaOpen(cat.slug)}
                      onMouseLeave={() => setMegaOpen(null)}
                      onClick={() => setMegaOpen((o) => (o === cat.slug ? null : cat.slug))}
                      tabIndex={-1}
                    >
                      <div style={{ position: "relative" }}>
                        <Link
                          href={`/category/${cat.slug}`}
                          className={`nav-link ${isActive(`/category/${cat.slug}`) ? "active" : ""}`}
                          onClick={handleLinkClick}
                          role="menuitem"
                        >
                          <FaTags aria-hidden="true" style={{ marginRight: 4 }} /> {cat.name}
                        </Link>
                        {hasSub && (
                          <div
                            className={`mega-menu${megaOpen === cat.slug ? " open" : ""}`}
                            aria-label={`${cat.name} subcategories`}
                            role="menu"
                          >
                            <div className="mega-menu-header">
                              {/* Hard-coded image/desc section */}
                              {cat.image && (
                                <img
                                  src={cat.image}
                                  alt={`${cat.name} category`}
                                  className="mega-menu-img"
                                />
                              )}
                              {cat.description && (
                                <div className="mega-menu-desc">{cat.description}</div>
                              )}
                            </div>
                            <div className="mega-menu-content">
                              {splitIntoColumns(cat.subcategories!, 4).map((column, i) => (
                                <div className="mega-menu-col" key={i}>
                                  {column.map((sub) => (
                                    <div key={sub.slug} className="mega-menu-group">
                                      <Link
                                        href={`/category/${cat.slug}/${sub.slug}`}
                                        className={`mega-menu-link ${
                                          isActive(`/category/${cat.slug}/${sub.slug}`) ? "active" : ""
                                        }`}
                                        onClick={handleLinkClick}
                                        role="menuitem"
                                      >
                                        {sub.name}
                                      </Link>
                                      {/* --- List of products for each subcategory (demo!) --- */}
                                      {/* 
                                          To enable live product display here, return products from your DB/API in each subcategory: 
                                          [
                                            ...,
                                            subcategories: [
                                              { name, slug, products: [ { name, slug, image? } ]}
                                            ]
                                          ]
                                          and map here:
                                      */}
                                      {sub.products && sub.products.length > 0 && (
                                        <div className="mega-products">
                                          {sub.products.map((prod) => (
                                            <Link
                                              href={`/product/${prod.slug}`}
                                              key={prod.slug}
                                              className="mega-product-link"
                                              onClick={handleLinkClick}
                                            >
                                              {prod.image && (
                                                <img src={prod.image} alt={prod.name} className="mega-product-thumb" />
                                              )}
                                              <span>{prod.name}</span>
                                            </Link>
                                          ))}
                                        </div>
                                      )}
                                      {/* --- End products --- */}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="nav-item" role="none">
                  <span className="nav-link" role="menuitem">
                    No categories available
                  </span>
                </li>
              )}
            </ul>
          )}
        </nav>
      </div>
    </header>
  );
}
