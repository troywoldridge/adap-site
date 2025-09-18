"use client";

import NextImage, { type ImageProps as NextImageProps } from "next/image";

type ImageProps = NextImageProps & { src: NextImageProps["src"] };

const CDN_HOSTS = new Set(["cdn.adap.com"]);

function getHostname(src: string | URL) {
  try {
    const u = new URL(typeof src === "string" ? src : String(src));
    return u.hostname.toLowerCase();
  } catch {
    return ""; // relative paths ok
  }
}

export type { ImageProps as NextImageProps } from "next/image";

export default function ImageSafe(props: ImageProps) {
  const { src, unoptimized, ...rest } = props as ImageProps & { src: any };
  const host = typeof src === "string" ? getHostname(src) : "";

  // If it's our R2 Cloudflare CDN host, bypass Next optimizer
  const isCdn = host && CDN_HOSTS.has(host);
  const finalUnoptimized = isCdn ? true : unoptimized;

  if (process.env.NODE_ENV !== "production" && isCdn) {
    console.warn(
      `[ImageSafe] next/image received CDN host '${host}'. ` +
      `Auto-setting unoptimized to avoid server-side fetch/ENOTFOUND.`
    );
  }

  

  return <NextImage src={src} unoptimized={finalUnoptimized} {...(rest as any)} />;
}
