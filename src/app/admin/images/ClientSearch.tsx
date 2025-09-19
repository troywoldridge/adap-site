// src/app/admin/images/ClientSearch.tsx
"use client";

import { useState, useMemo } from "react";
import Image, { type ImageLoader } from "next/image";
import Fuse from "fuse.js";

type ImageRecord = {
  id: string;
  filename?: string;
  variants?: { [key: string]: string };
};

export default function ClientSearch({
  images,
}: {
  images: ImageRecord[] | { [key: string]: ImageRecord };
}) {
  const [q, setQ] = useState("");

  // Normalize to an array
  const imageArray: ImageRecord[] = useMemo(
    () => (Array.isArray(images) ? images : Object.values(images)),
    [images]
  );

  // Configure Fuse
  const fuse = useMemo(() => {
    return new Fuse(imageArray, {
      keys: ["filename", "id"],
      threshold: 0.4, // adjust for more/less fuzziness
      minMatchCharLength: 2,
    });
  }, [imageArray]);

  // Perform fuzzy search or show all if empty
  const filtered = q ? fuse.search(q).map((r) => r.item) : imageArray;

  // Cloudflare Images settings
  const cfHash = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH!;
  const base = process.env.NEXT_PUBLIC_IMAGE_DELIVERY_BASE!; // e.g. "https://imagedelivery.net"
  const variant = "public";

  // Minimal Cloudflare loader for next/image
  const cfLoader: ImageLoader = ({ src, quality }) => {
    // `src` will be the image id (we pass id as src below)
    const q = quality ? `?q=${quality}` : "";
    return `${base}/${cfHash}/${src}/${variant}${q}`;
  };

  return (
    <main className="container mx-auto p-8">
      <h1 className="mb-4 text-2xl font-bold">Image Admin</h1>

      <input
        autoFocus
        className="mb-6 w-full border p-2"
        placeholder="Search filename or ID…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {filtered.length === 0 ? (
        <p>
          No images match “<span className="font-medium">{q}</span>”.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((img) => {
            const id = String(img.id);
            const name = img.filename || id;

            return (
              <li key={id} className="overflow-hidden rounded border">
                {/* Use `fill` so we get an easy cover crop */}
                <div className="relative h-48 w-full bg-gray-100">
                  <Image
                    loader={cfLoader}
                    src={id}
                    alt={String(name)}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 360px"
                    style={{ objectFit: "cover" }}
                    // No need for `unoptimized` because we provide a custom loader.
                  />
                </div>
                <div className="p-2">
                  <p className="break-all text-sm font-medium">{name}</p>
                  <p className="break-all text-xs text-gray-500">{id}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
