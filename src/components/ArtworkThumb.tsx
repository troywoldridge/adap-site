// src/components/ArtworkThumb.tsx
"use client";

import Image from "@/components/ImageSafe";
import { r2PublicUrl, artworkThumbUrl, isPdfMime, safeText } from "@/lib/r2Public";

type Props = {
  publicUrl: string;        // R2 key or absolute URL; may also be blob:/data: before upload
  mime?: string | null;
  filename?: string | null;
  className?: string;
};

function isBlobLike(u: string) {
  return /^blob:|^data:/i.test(u);
}

export default function ArtworkThumb({ publicUrl, mime, filename, className }: Props) {
  const alt = safeText(filename || "artwork");

  // If the UI is showing a client-side preview BEFORE upload, you'll get blob:/data: URLs.
  if (isBlobLike(publicUrl)) {
    return (
      <div className={className}>
        <img
          src={publicUrl}
          alt={alt}
          style={{
            width: 160,
            height: 160,
            objectFit: "cover",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            backgroundColor: "white",
            display: "block",
          }}
          draggable={false}
        />
      </div>
    );
  }

  // After upload — show public CDN URL
  const href = r2PublicUrl(publicUrl);

  if (isPdfMime(mime)) {
    return (
      <a
        href={href}
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

  const thumb = artworkThumbUrl(href);

  return (
    <a href={href} target="_blank" rel="noreferrer" title={alt} className={className}>
      <Image
        src={thumb}
        alt={alt}
        width={160}
        height={160}
        style={{
          objectFit: "cover",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          backgroundColor: "white",
          display: "block",
        }}
        draggable={false}
      />
    </a>
  );
}
