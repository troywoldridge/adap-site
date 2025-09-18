"use client";

import Image from "@/components/ImageSafe";
import { makeCloudflareLoader } from "@/lib/cfImages";

/** Uses your "subcategoryCard" preset which maps to subcategoryThumb/category variants */
const subcategoryLoader = makeCloudflareLoader("subcategoryCard");

type Props = {
  /** Cloudflare IMAGE_ID if kind === "id"; otherwise a full URL (/images/... or https) */
  src: string;
  kind: "id" | "url";
  alt: string;
  className?: string;
};

/**
 * Self-wrapping tile image:
 * - Provides its own positioned wrapper for <Image fill />
 * - Works with Cloudflare Image IDs via your custom loader (CDN!)
 * - Falls back to unoptimized for arbitrary remote URLs when kind="url"
 */
export default function SubcategoryTileImage({ src, kind, alt, className }: Props) {
  return (
    <div className={`relative w-full aspect-[4/3] bg-gray-50 ${className ?? ""}`}>
      {kind === "id" ? (
        <Image
          loader={subcategoryLoader}
          src={src} // Cloudflare IMAGE_ID
          alt={alt}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 360px"
          style={{ objectFit: "cover" }}
          priority={false}
        />
      ) : (
        <Image
          src={src} // full URL or /images/...
          alt={alt}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 360px"
          style={{ objectFit: "cover" }}
          unoptimized
          priority={false}
        />
      )}
    </div>
  );
}
