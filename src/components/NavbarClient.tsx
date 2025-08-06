"use client";

import React from "react";
import Link from "next/link";
import categoryAssets from "@/data/categoryAssets.json";

type CategoryAsset = {
  imageId: string;
  variant: string;
  imageUrl: string;
  description: string;
};

export interface NavCatMega {
  name: string;
  href: string;
  imageUrl?: string;
  description?: string;
  children?: NavCatMega[];
}

export interface NavbarClientProps {
  navItems?: NavCatMega[];
}

export default function NavbarClient({ navItems }: NavbarClientProps) {
  const items: NavCatMega[] = navItems && navItems.length
    ? navItems
    : (Object.entries(categoryAssets) as [string, CategoryAsset][]).map(
        ([categoryId, asset]) => ({
          name: categoryId
            .split("-")
            .map((w) => w[0].toUpperCase() + w.slice(1))
            .join(" "),
          href: `/category/${categoryId}`,
          imageUrl: asset.imageUrl,
          description: asset.description,
          children: [],
        })
      );

  return (
    <nav className="site-secondary-nav">
      <ul className="inner container">
        {items.map((item) => (
          <li key={item.href} className="group relative text-center">
            <Link href={item.href}>
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.description || item.name}
                  className="h-8 w-8 rounded-full object-cover mb-1"
                />
              )}
              <span className="text-sm font-medium">{item.name}</span>
            </Link>

            {item.children && item.children.length > 0 && (
              <div className="dropdown">
                <ul>
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <Link href={child.href}>{child.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
