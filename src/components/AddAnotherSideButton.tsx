"use client";

import Link from "next/link";

export default function AddAnotherSideButton({
  productId,
  lineId,
  currentSides,
  label,
}: {
  productId: number;
  lineId: string;
  currentSides: number;
  label?: string;
}) {
  const nextSide = (currentSides || 0) + 1;
  const href = `/product/${productId}/upload-artwork?lineId=${encodeURIComponent(
    lineId
  )}&sides=${nextSide}&focusSide=${nextSide}#side-${nextSide}`;

  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-lg border border-dashed border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
    >
      {label ?? "+ Add another side"}
    </Link>
  );
}
