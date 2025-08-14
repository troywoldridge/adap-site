// src/components/ContinueToUploadButton.tsx
"use client";

import Link from "next/link";

export default function ContinueToUploadButton({
  productId,
  orderId,
  sides = 1,
}: {
  productId: string | number;
  orderId: string;
  sides?: number;
}) {
  const pid = String(productId);
  const href = `/product/${encodeURIComponent(
    pid
  )}/upload-artwork?sides=${encodeURIComponent(String(sides))}&orderId=${encodeURIComponent(
    orderId
  )}`;
  return (
    <Link href={href} className="btn btn-primary">
      Upload your artwork
    </Link>
  );
}
