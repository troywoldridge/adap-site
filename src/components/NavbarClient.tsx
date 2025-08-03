// src/components/NavbarClient.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaBars, FaTimes, FaHome, FaTags } from "react-icons/fa";
import type { NavCat } from "@/lib/queries/getNavbarData";

interface Props {
  navItems?: NavCat[];
}

type FetchState = {
  data?: NavCat[];
  loading: boolean;
  error?: string;
};

export default function NavbarClient({ navItems: initialNavItems }: Props) {
  const [open, setOpen] = useState(false);
  const [fetchState, setFetchState] = useState<FetchState>({
    data: initialNavItems,
    loading: !initialNavItems,
    error: undefined,
  });

  const path = usePathname() || "/";
  const isActive = useCallback(
    (href: string) => {
      if (!href) return false;
      if (href === "/") return path === "/";
      return path === href || path.startsWith(href + "/");
    },
    [path]
  );

  const categories: NavCat[] = fetchState.data || [];
  const navRef = useRef<HTMLElement | null>(null);

  // Fetch from API if no initial props
  useEffect(() => {
    if (initialNavItems) return; // already provided

    let cancelled = false;
    setFetchState((s) => ({ ...s, loading: true, error: undefined }));

    fetch("/api/navbar")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load navbar: ${res.statusText}`);
        const payload = await res.json();
        if (!cancelled) {
          setFetchState({ data: payload.navItems || [], loading: false });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Navbar fetch error:", err);
          setFetchState({ data: [], loading: false, error: err.message || "Failed to load" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialNavItems]);

  // close menu on outside click or Escape
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (open && navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // close mobile nav on resize if viewport grows (debounced)
  useEffect(() => {
    let timeout: number | null = null;
    const onResize = () => {
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        if (window.innerWidth > 900 && open) {
          setOpen(false);
        }
      }, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      if (timeout) window.clearTimeout(timeout);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const handleLinkClick = () => {
    setOpen(false);
  };

  return (
    <header className="navbar" ref={(el) => (navRef.current = el)}>
      <div className="navbar-container">
        <Link href="/" className="nav-logo" onClick={handleLinkClick}>
          <FaHome aria-hidden="true" style={{ marginRight: 6 }} /> ADAP
        </Link>

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

        <nav
          id="main-navigation"
          className={`nav-links ${open ? "open" : ""}`}
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
                    <li key={cat.slug} className="nav-item" role="none">
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
                          <ul
                            className="dropdown-menu"
                            aria-label={`${cat.name} subcategories`}
                            role="menu"
                          >
                            {cat.subcategories!.map((sub) => (
                              <li key={sub.slug} className="dropdown-item" role="none">
                                <Link
                                  href={`/category/${cat.slug}/${sub.slug}`}
                                  className={`dropdown-link ${
                                    isActive(`/category/${cat.slug}/${sub.slug}`) ? "active" : ""
                                  }`}
                                  onClick={handleLinkClick}
                                  role="menuitem"
                                >
                                  {sub.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
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
