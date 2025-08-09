"use client";

import { useState } from "react";
import Image from "next/image";
import productImagesRaw from "@/data/productImages.json";

export default function ImageAdminPage() {
  const [query, setQuery] = useState("");

  // Normalize import (array vs. object)
  const allImages = Array.isArray(productImagesRaw)
    ? productImagesRaw
    : Object.values(productImagesRaw);

  const q = query.toLowerCase();

  const filtered = allImages.filter((img: any) => {
    // Coerce both fields to strings
    const name = String(img.image_name ?? "");
    const id   = String(img.cloudflare_id ?? "");

    return name.toLowerCase().includes(q) || id.includes(q);
  });

  return (
    <main className="p-8 container mx-auto">
      <h1 className="text-2xl font-bold mb-4">Image Admin</h1>

      <input
        type="text"
        placeholder="Search by filename or ID…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border p-2 mb-6 w-full"
      />

      {filtered.length === 0 ? (
        <p>No images match “{query}”.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((img: any) => {
            const fileName = img.image_name ?? "(no name)";
            const cfId      = img.cloudflare_id ?? "(no ID)";
            // Use the 'thumbnail' variant for faster small previews
            const url = `https://imagedelivery.net/${process.env.CF_ACCOUNT_HASH}/${cfId}/thumbnail`;

            return (
              <li key={cfId} className="border rounded overflow-hidden">
                <div className="relative w-full h-48 bg-gray-100">
                  <Image
                    src={url}
                    alt={fileName}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-2">
                  <p className="text-sm font-medium break-all">{fileName}</p>
                  <p className="text-xs text-gray-500 break-all">{cfId}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
