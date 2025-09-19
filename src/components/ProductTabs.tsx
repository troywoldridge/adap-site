// src/components/ProductTabs.tsx
"use client";
import { useState } from "react";
import type { Product } from "@/types/product";

interface Props {
  product: Product;
}

const tabs = [
  { key: "details", label: "Details" },
  { key: "fileprep", label: "File Prep" },
  { key: "reviews", label: "Reviews" },
];

// tiny helpers so we don’t poke unknown keys on the Product type
function getString(obj: unknown, key: string): string | undefined {
  const v = (obj as Record<string, unknown> | null)?.[key];
  return typeof v === "string" && v.trim() ? v : undefined;
}
function getStringArray(obj: unknown, key: string): string[] | undefined {
  const v = (obj as Record<string, unknown> | null)?.[key];
  return Array.isArray(v) ? (v.filter((x) => typeof x === "string") as string[]) : undefined;
}

export default function ProductTabs({ product }: Props) {
  const [tab, setTab] = useState("details");

  // Read optional fields defensively (works whether they exist or not)
  const pAny = product as unknown;
  const paperType = getString(pAny, "paperType");
  const coating = getString(pAny, "coating");
  const color = getString(pAny, "color");
  const sizes =
    getStringArray(pAny, "sizes") ||
    getStringArray(pAny, "sizeOptions"); // allow either, if present
  const finishing = getString(pAny, "finishing");
  const fileType = getString(pAny, "fileType");
  const specialInstructions = getString(pAny, "specialInstructions");

  return (
    <div className="product-tabs">
      <div className="flex border-b gap-6 mb-3">
        {tabs.map((t) => (
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
              <li><strong>Paper Type:</strong> {paperType || "See options above"}</li>
              <li><strong>Coating:</strong> {coating || "—"}</li>
              <li><strong>Color:</strong> {color || "Full color"}</li>
              <li><strong>Sizes:</strong> {sizes?.length ? sizes.join(", ") : "See options above"}</li>
              <li><strong>Finishing:</strong> {finishing || "—"}</li>
              <li><strong>File Type:</strong> {fileType || "Print Ready PDF"}</li>
            </ul>

            {specialInstructions && (
              <div className="mt-3 text-red-700 text-sm">{specialInstructions}</div>
            )}
          </div>
        )}

        {tab === "fileprep" && (
          <div>
            <h3 className="font-semibold mb-2">File Prep</h3>
            <p>
              Prepare a print-ready PDF with correct bleed and safe margins.
              (You can also surface product-specific guidance you fetch from SinaLite.)
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
