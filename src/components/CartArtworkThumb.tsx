// src/components/CartArtworkThumb.tsx
"use client";

import Image from "next/image";
import { useMemo, useState, useCallback } from "react";
import { isPdfUrl, thumbCandidatesFor } from "@/lib/artworkThumb";

type Props = {
  url: string;            // original artwork URL (PDF or image)
  alt?: string;
  size?: number;          // square size in px
  className?: string;
  // Optional CTA:
  openLabel?: string;     // e.g. "View PDF"
};

export default function CartArtworkThumb({
  url,
  alt = "Artwork",
  size = 80,
  className = "",
  openLabel = "View",
}: Props) {
  const pdf = isPdfUrl(url);

  const candidates = useMemo(
    () => (pdf ? thumbCandidatesFor(url) : [url]),
    [pdf, url]
  );

  const [srcIndex, setSrcIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const currentSrc = candidates[srcIndex];

  const onImgError = useCallback(() => {
    const next = srcIndex + 1;
    if (next < candidates.length) {
      setSrcIndex(next);
    } else {
      setFailed(true);
    }
  }, [srcIndex, candidates.length]);

  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`}>
      {/* Thumbnail box */}
      <div className="relative overflow-hidden rounded border bg-white" style={{ width: size, height: size }}>
        {!failed ? (
          <Image
            src={currentSrc}
            alt={alt}
            width={size}
            height={size}
            className="object-cover"
            unoptimized
            onError={onImgError}
          />
        ) : (
          // Fallback for PDFs or missing thumbs
          <div className="flex h-full w-full items-center justify-center bg-slate-100">
            {pdf ? (
              <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">PDF</span>
            ) : (
              <span className="rounded bg-slate-500 px-2 py-0.5 text-xs font-semibold text-white">FILE</span>
            )}
          </div>
        )}
      </div>

      {/* Open original file */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-blue-700 hover:underline"
      >
        {openLabel}
      </a>
    </div>
  );
}
