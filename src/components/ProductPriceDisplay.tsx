// src/components/ProductPriceDisplay.tsx
"use client";

import React from "react";

type ProductPriceDisplayProps = {
  /** The current product price in major currency units (e.g. 5.28), or null if not yet determined */
  price: number | null;
  /** ISO currency code, defaults to USD */
  currency?: string;
};

export default function ProductPriceDisplay({
  price,
  currency = "USD",
}: ProductPriceDisplayProps) {
  // Format with Intl.NumberFormat once
  const formatted = price != null
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price)
    : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-4 text-xl font-bold text-gray-900"
    >
      {formatted ? (
        <span>{formatted}</span>
      ) : (
        <span className="text-gray-500">Select options to see price</span>
      )}
    </div>
  );
}
