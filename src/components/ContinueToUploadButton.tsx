// src/components/ContinueToUploadButton.tsx
"use client";
import Link from "next/link";

export default function ContinueToUploadButton({
  productId,
  orderId,
  sides,
}: {
  productId: string;
  orderId: string;
  sides?: number;
}) {
  const base = `/product/${encodeURIComponent(productId)}/upload-artwork`; // <-- singular
  const query = new URLSearchParams({ orderId });
  if (typeof sides === "number" && sides > 0) {
    query.set("sides", String(sides));
  }

  return (
    <Link href={`${base}?${query.toString()}`} className="btn btn-secondary">
      Continue to Upload Artwork
    </Link>
  );
}
