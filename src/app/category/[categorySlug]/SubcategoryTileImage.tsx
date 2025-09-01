"use client";

import Image from "next/image";
import { makeCloudflareLoader } from "@/lib/cfImages";

const subcategoryLoader = makeCloudflareLoader("subcategoryCard");

export default function SubcategoryTileImage({
  src,
  kind,
  alt,
}: {
  /** Cloudflare IMAGE_ID if kind === "id"; otherwise a direct URL (/images/... or https) */
  src: string;
  kind: "id" | "url";
  alt: string;
}) {
  if (kind === "id") {
    return (
      <Image
        loader={subcategoryLoader}
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 360px"
        style={{ objectFit: "cover" }}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 360px"
      style={{ objectFit: "cover" }}
      unoptimized
    />
  );
}
