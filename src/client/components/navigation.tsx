// src/client/components/navigation.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

export type NavItem = { href: string; label: string; exact?: boolean };
type Props = { items: NavItem[] };

export default function Navigation({ items }: Props) {
  const pathname = usePathname() ?? '/';

  const activeMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const it of items) {
      const href = it.href || '/';
      const isActive = it.exact ? pathname === href : pathname.startsWith(href);
      map.set(href, isActive);
    }
    return map;
  }, [items, pathname]);

  return (
    <nav aria-label="Primary" className="flex gap-4">
      {items.map((it: NavItem) => {
        const active = activeMap.get(it.href) === true;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={active ? 'font-semibold underline' : 'hover:underline'}
            aria-current={active ? 'page' : undefined}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
