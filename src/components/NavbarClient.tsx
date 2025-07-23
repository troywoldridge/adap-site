// src/components/NavbarClient.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBars, FaTimes, FaHome, FaTags } from 'react-icons/fa';
import type { NavCat } from '@/lib/queries/getNavbarData';

export default function NavbarClient({ navItems }: { navItems: NavCat[] }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const isActive = (href: string) => path === href || path?.startsWith(href + '/');

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link href="/" className="nav-logo" onClick={()=>setOpen(false)}>
          <FaHome /> ADAP
        </Link>
        <button className="hamburger" onClick={()=>setOpen(o=>!o)}>
          {open ? <FaTimes/> : <FaBars/>}
        </button>
        <nav className={`nav-links ${open? 'open':''}`}>
          <ul className="nav-menu">
            {navItems.map(cat => (
              <li key={cat.slug} className="nav-item">
                <Link
                  href={`/category/${cat.slug}`}
                  className={`nav-link ${isActive(`/category/${cat.slug}`)?'active':''}`}
                  onClick={()=>setOpen(false)}
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
                            isActive(`/category/${cat.slug}/${sub.slug}`)?'active':''
                          }`}
                          onClick={()=>setOpen(false)}
                        >{sub.name}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
