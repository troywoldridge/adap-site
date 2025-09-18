"use client";

import { useState, type ReactNode } from "react";
import ProductReviews from "@/components/product/ProductReviews";

type Props = {
  details: ReactNode;
  filePrep: ReactNode;
  reviewsProductId: string | number;
  reviewsProductName?: string;
  className?: string;
};

export default function ProductInfoTabs({
  details,
  filePrep,
  reviewsProductId,
  reviewsProductName,
  className = "",
}: Props) {
  const [tab, setTab] = useState<"details" | "file" | "reviews">("details");

  const TabButton = ({
    id,
    label,
  }: {
    id: "details" | "file" | "reviews";
    label: string;
  }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-md px-3 py-2 text-sm font-medium transition ${
        tab === id ? "bg-blue-600 text-white" : "bg-white text-neutral-700 border hover:bg-neutral-50"
      } border`}
      aria-selected={tab === id}
    >
      {label}
    </button>
  );

  return (
    <div className={`mt-6 ${className}`}>
      <div className="flex gap-2">
        <TabButton id="details" label="Details" />
        <TabButton id="file" label="File Prep" />
        <TabButton id="reviews" label="Reviews" />
      </div>

      <div className="mt-4 rounded-xl border bg-white p-4">
        {tab === "details" && <div>{details}</div>}
        {tab === "file" && <div>{filePrep}</div>}
        {tab === "reviews" && (
          <div>
            <ProductReviews
              productId={reviewsProductId}
              productName={reviewsProductName ?? ""}
            />
          </div>
        )}
      </div>
    </div>
  );
}
