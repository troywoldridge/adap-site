"use client";
import { useState } from "react";
import type { Product } from "@/types/product";

interface Props {
  product: Product;
}

const tabs = [
  { key: "details", label: "Details" },
  { key: "fileprep", label: "File Prep" },
  { key: "reviews", label: "Reviews" }
];

export default function ProductTabs({ product }: Props) {
  const [tab, setTab] = useState("details");
  return (
    <div className="product-tabs">
      <div className="flex border-b gap-6 mb-3">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`px-3 py-2 border-b-2 font-medium transition ${
              tab === t.key ? "border-blue-700 text-blue-800" : "border-transparent"
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {tab === "details" && (
          <div>
            <h3 className="font-semibold mb-2">Product Specs</h3>
            <ul className="text-sm space-y-2">
              <li><strong>Paper Type:</strong> {product.paperType || "See options above"}</li>
              <li><strong>Coating:</strong> {product.coating || "—"}</li>
              <li><strong>Color:</strong> {product.color || "Full color"}</li>
              <li><strong>Sizes:</strong> {product.sizes?.join(", ") || "See options above"}</li>
              <li><strong>Finishing:</strong> {product.finishing || "—"}</li>
              <li><strong>File Type:</strong> {product.fileType || "Print Ready PDF"}</li>
              {/* ...other product details */}
            </ul>
            {product.specialInstructions && (
              <div className="mt-3 text-red-700 text-sm">{product.specialInstructions}</div>
            )}
          </div>
        )}
        {tab === "fileprep" && (
          <div>
            <h3 className="font-semibold mb-2">File Prep</h3>
            <p>
              {/* You can customize or pull this info from your assets or API */}
              Contains everything you need to know about file prep for this product.
            </p>
          </div>
        )}
        {tab === "reviews" && (
          <div>
            <h3 className="font-semibold mb-2">Reviews</h3>
            <p>No reviews yet. Be the first to review this product!</p>
          </div>
        )}
      </div>
    </div>
  );
}
