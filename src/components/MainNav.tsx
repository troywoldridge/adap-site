// src/components/MainNav.tsx
"use client";

import Link from "next/link";

const TOP_LEVEL = [
  "business-cards",
  "print-products",
  "large-format",
  "stationery",
  "promotional",
  "labels-and-packaging",
  "apparel",
  "sample-kits",
] as const;

function humanize(slug: string) {
  return slug
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export default function MainNav() {
  return (
    <nav className="main-nav">
      <div className="inner">
        {TOP_LEVEL.map((slug) => (
          <Link
            key={slug}
            href={`/category/${slug}`}
            className="main-nav__item"
          >
            {humanize(slug)}
          </Link>
        ))}
      </div>
    </nav>
  );
}
