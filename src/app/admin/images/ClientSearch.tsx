"use client";

import { useState, useMemo } from "react";
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
      threshold: 0.4,      // adjust for more/less fuzziness
      minMatchCharLength: 2,
    });
  }, [imageArray]);

  // Perform fuzzy search or show all if empty
  const filtered = q
    ? fuse.search(q).map(result => result.item)
    : imageArray;

  const cfHash  = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH!;
  const base    = process.env.NEXT_PUBLIC_IMAGE_DELIVERY_BASE!;
  const variant = "public";

  return (
    <main className="p-8 container mx-auto">
      <h1 className="text-2xl font-bold mb-4">Image Admin</h1>

      <input
        autoFocus
        className="border p-2 w-full mb-6"
        placeholder="Search filename or ID…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {filtered.length === 0 ? (
        <p>No images match “{q}”.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((img) => {
            const id   = String(img.id);
            const name = img.filename || id;
            const src  = `${base}/${cfHash}/${id}/${variant}`;

            return (
              <li key={id} className="border rounded overflow-hidden">
                <div className="w-full h-48 bg-gray-100">
                  <img
                    src={src}
                    alt={name}
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                <div className="p-2">
                  <p className="text-sm font-medium break-all">{name}</p>
                  <p className="text-xs text-gray-500 break-all">{id}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
