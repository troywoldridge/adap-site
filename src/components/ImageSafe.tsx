// src/components/ImageSafe.tsx
"use client";

import NextImage, { type ImageProps } from "next/image";
import { getR2PublicHost } from "@/lib/r2Public";

// Build a dynamic bypass list for already-optimized CDNs
const byPassHosts = new Set<string>(
  ["imagedelivery.net", getR2PublicHost() || ""].filter(Boolean),
);

type Props = ImageProps & { src: ImageProps["src"] };

function hostnameOf(src: string | URL) {
  try {
    const u = new URL(typeof src === "string" ? src : String(src));
    return u.hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** Safe wrapper that bypasses Next optimizer for Cloudflare Images + your R2 CDN */
export default function ImageSafe({ src, unoptimized, ...rest }: Props) {
  const host = typeof src === "string" ? hostnameOf(src) : "";
  const finalUnoptimized = host && byPassHosts.has(host) ? true : unoptimized;

  return <NextImage src={src} unoptimized={finalUnoptimized} {...(rest as any)} />;
}

// Optional: re-export an alias to keep older imports happy
export type NextImageProps = ImageProps;
export type { ImageProps as DefaultImageProps } from "next/image";
