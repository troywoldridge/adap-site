// src/components/NavbarClient.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBars, FaTimes, FaHome, FaTags } from 'react-icons/fa';
import type { NavCat } from '@/lib/queries/getNavbarData';

export default function NavbarClient({ navItems }: { navItems?: NavCat[] }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const isActive = (href: string) => path === href || path?.startsWith(href + '/');

  const categories = navItems || [];

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link href="/" className="nav-logo" onClick={() => setOpen(false)}>
          <FaHome /> ADAP
        </Link>
        <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
          {open ? <FaTimes /> : <FaBars />}
        </button>
        <nav className={`nav-links ${open ? 'open' : ''}`} aria-label="Main navigation">
          <ul className="nav-menu">
            {categories.map(cat => (
              <li key={cat.slug} className="nav-item">
                <Link
                  href={`/category/${cat.slug}`}
                  className={`nav-link ${isActive(`/category/${cat.slug}`) ? 'active' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  <FaTags /> {cat.name}
                </Link>
                {cat.subcategories.length > 0 && (
                  <ul className="dropdown-menu">
                    {cat.subcategories.map(sub => (
                      <li key={sub.slug} className="dropdown-item">
                        <Link
                          href={`/category/${cat.slug}/${sub.slug}`}
                          className={`dropdown-link ${
                            isActive(`/category/${cat.slug}/${sub.slug}`) ? 'active' : ''
                          }`}
                          onClick={() => setOpen(false)}
                        >
                          {sub.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {categories.length === 0 && (
              <li className="nav-item">
                <span className="nav-link">No categories available</span>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}


