"use client";

import Image from "next/image";
import { makeCloudflareLoader } from "@/lib/cfImages";

const productCardLoader = makeCloudflareLoader("productCard");

export default function ProductCardImage({
  product,
}: {
  product: { name: string; cloudflareImageId?: string | null; image?: string | null };
}) {
  const id = product.cloudflareImageId?.trim() || "";
  const fallbackUrl = product.image && product.image.startsWith("http") ? product.image : "";

  if (id) {
    return (
      <Image
        loader={productCardLoader}
        src={id}
        alt={product.name}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 360px"
        style={{ objectFit: "cover" }}
      />
    );
  }

  if (fallbackUrl) {
    return (
      <Image
        src={fallbackUrl}
        alt={product.name}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 360px"
        style={{ objectFit: "cover" }}
        unoptimized
      />
    );
  }

  return (
    <Image
      src="/placeholder.png"
      alt={product.name}
      fill
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 360px"
      style={{ objectFit: "cover" }}
      unoptimized
    />
  );
}
