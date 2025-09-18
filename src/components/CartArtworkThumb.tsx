// src/components/CartArtworkThumb.tsx
"use client";
import Image from "@/components/ImageSafe";

type Props = {
  url?: string | null;        // e.g. https://cdn.adap.com/... (R2 via CF)
  cfImageId?: string | null;  // if present, serve via Cloudflare Images
  alt?: string;
  className?: string;
};

const CF_ACCOUNT = process.env.NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH || "";
const CF_VARIANT = "productCard";

export default function CartArtworkThumb({ url, cfImageId, alt = "Artwork", className = "" }: Props) {
  if (cfImageId && CF_ACCOUNT) {
    const src = `https://imagedelivery.net/${CF_ACCOUNT}/${cfImageId}/${CF_VARIANT}`;
    return (
      <div className={`relative h-14 w-14 overflow-hidden rounded border border-neutral-200 ${className}`}>
        <Image src={src} alt={alt} fill sizes="56px" style={{ objectFit: "cover" }} draggable={false} />
      </div>
    );
  }

  if (url) {
    return (
      <div className={`relative h-14 w-14 overflow-hidden rounded border border-neutral-200 ${className}`}>
        <img src={url} alt={alt} decoding="async" loading="lazy"
             style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
             draggable={false}/>
      </div>
    );
  }

  return (
    <div className={`inline-flex h-14 w-14 items-center justify-center rounded border border-neutral-200 bg-neutral-100 text-xs text-neutral-500 ${className}`}>
      No art
    </div>
  );
}
