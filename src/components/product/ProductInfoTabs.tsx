"use client";

import { useState } from "react";
import ProductReviews from "./ProductReviews";

export default function ProductInfoTabs({
  details,
  filePrep,
  reviewsProductId,
  reviewsProductName,
}: {
  details: React.ReactNode;           // safe markup (no handlers)
  filePrep: React.ReactNode;          // safe markup (no handlers)
  reviewsProductId: string | number;  // primitives only
  reviewsProductName?: string;
}) {
  const [tab, setTab] = useState<"details" | "file" | "reviews">("details");

  const TabBtn = ({
    id,
    label,
  }: {
    id: "details" | "file" | "reviews";
    label: string;
  }) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={[
        "relative -mb-px px-3 md:px-6 py-3",
        "text-base md:text-lg font-semibold transition-colors",
        tab === id ? "text-gray-900" : "text-gray-500 hover:text-gray-800",
      ].join(" ")}
    >
      {label}
      <span
        className={[
          "pointer-events-none absolute inset-x-0 -bottom-[1px] h-[2px]",
          tab === id ? "bg-blue-600" : "bg-transparent",
        ].join(" ")}
      />
    </button>
  );

  return (
    <section className="mt-12">
      <div role="tablist" className="flex items-end justify-start gap-8 border-b border-gray-200">
        <TabBtn id="details" label="Details" />
        <TabBtn id="file" label="File Prep" />
        <TabBtn id="reviews" label="Reviews" />
      </div>

      <div className="mt-6">
        {tab === "details" && <div className="prose max-w-none">{details}</div>}
        {tab === "file" && <div className="prose max-w-none">{filePrep}</div>}
        {tab === "reviews" && (
          <ProductReviews
            productId={reviewsProductId}
            productName={reviewsProductName}
          />
        )}
      </div>
    </section>
  );
}
