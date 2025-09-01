"use client";

import Image from "next/image";
import { makeCloudflareLoader } from "@/lib/cfImages";

const subcategoryLoader = makeCloudflareLoader("subcategoryCard");

// Flexible props so old & new call sites both work.
type Props =
  | { src: string; kind: "id" | "url"; alt: string }                 // new resolver shape
  | { imageId?: string | null; imageUrl?: string | null; alt: string }; // legacy: pass one of these

export default function SubcategoryTileImage(props: Props) {
  let mode: "id" | "url";
  let src = "";
  let alt = "Image";

  if ("src" in props) {
    mode = props.kind;
    src = props.src || "";
    alt = props.alt;
  } else {
    const { imageId, imageUrl } = props;
    alt = props.alt;
    if (imageId) { mode = "id"; src = imageId; }
    else { mode = "url"; src = imageUrl || "/placeholder.png"; }
  }

  if (mode === "id") {
    // Cloudflare IMAGE_ID → loader (direct CDN, no /_next/image)
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

  // URL fallback → render direct and bypass optimizer (no 403)
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
