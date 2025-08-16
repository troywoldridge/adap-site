"use client";

import Image from "next/image";
import { artworkThumbUrl, safeText, isPdfMime } from "@/lib/cdn";

type Props = {
  publicUrl: string;
  mime?: string | null;
  filename?: string | null;
  className?: string;
};

/**
 * ArtworkThumb
 * - If image/* → uses Cloudflare Image Resizing thumbnail
 * - If PDF → shows a simple PDF badge box linking to file
 * - Always links to the original URL in a new tab
 */
export default function ArtworkThumb({ publicUrl, mime, filename, className }: Props) {
  const alt = safeText(filename || "artwork");
  const thumb = artworkThumbUrl(publicUrl, mime);

  if (isPdfMime(mime)) {
    return (
      <a
        href={publicUrl}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center justify-center border rounded bg-white/40 text-sm font-medium hover:shadow ${className ?? ""}`}
        style={{ width: 160, height: 160 }}
        title={alt}
      >
        <span>PDF</span>
      </a>
    );
  }

  return (
    <a href={publicUrl} target="_blank" rel="noreferrer" title={alt} className={className}>
      <Image
        src={thumb}
        alt={alt}
        width={160}
        height={160}
        style={{ objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb", backgroundColor: "white" }}
      />
    </a>
  );
}
