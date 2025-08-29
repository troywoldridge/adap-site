// src/client/components/navigation.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PrimaryNav() {
  const pathname = usePathname();
  // Hide this bar on product pages so our real breadcrumb can shine
  if (pathname.startsWith("/product/")) return null;

  return (
    <nav aria-label="Primary" className="flex gap-4">
      <Link className="hover:underline" href="/">Home</Link>
      <Link className="hover:underline" href="/products">Products</Link>
      <Link className="hover:underline" href="/cart">Cart</Link>
      <Link className="hover:underline" href="/cart/review">Review</Link>
    </nav>
  );
}
