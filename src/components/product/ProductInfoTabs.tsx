"use client";

import { useState } from "react";

export default function ProductInfoTabs({
  details,
  filePrep,
  reviewsSlot,
}: {
  details: React.ReactNode;
  filePrep: React.ReactNode;
  reviewsSlot: React.ReactNode;
}) {
  const [tab, setTab] = useState<"details"|"file"|"reviews">("details");
  const base = "px-4 py-2 text-sm font-semibold rounded-md border";
  const active = "bg-blue-700 text-white border-blue-700";
  const inactive = "bg-white text-gray-800 border-gray-300 hover:bg-gray-50";

  return (
    <section className="mt-8">
      <div className="flex gap-2">
        <button className={`${base} ${tab === "details" ? active : inactive}`} onClick={() => setTab("details")}>Details</button>
        <button className={`${base} ${tab === "file" ? active : inactive}`} onClick={() => setTab("file")}>File Prep</button>
        <button className={`${base} ${tab === "reviews" ? active : inactive}`} onClick={() => setTab("reviews")}>Reviews</button>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        {tab === "details" && <div className="prose max-w-none">{details}</div>}
        {tab === "file" && <div className="prose max-w-none">{filePrep}</div>}
        {tab === "reviews" && <div>{reviewsSlot}</div>}
      </div>
    </section>
  );
}
