"use client";

import Image from "next/image";
import { makeCloudflareLoader } from "@/lib/cfImages";

const categoryLoader = makeCloudflareLoader("categoryCard");

// Accept either a Cloudflare imageId or a URL fallback
export default function CategoryCardImage({
  imageId,
  imageUrl,
  alt,
}: {
  imageId?: string | null;
  imageUrl?: string | null; // e.g. "/images/cat-*.jpg"
  alt: string;
}) {
  if (imageId) {
    return (
      <Image
        loader={categoryLoader}
        src={imageId}
        alt={alt}
        fill
        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 360px"
        style={{ objectFit: "cover" }}
      />
    );
  }

  return (
    <Image
      src={imageUrl || "/placeholder.png"}
      alt={alt}
      fill
      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 360px"
      style={{ objectFit: "cover" }}
      unoptimized
    />
  );
}
