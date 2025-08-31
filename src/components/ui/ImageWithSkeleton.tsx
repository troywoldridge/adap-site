// src/components/ui/ImageWithSkeleton.tsx
"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";
import clsx from "clsx";

type Props = ImageProps & {
  /** Optional: rounded corners for the skeleton wrapper */
  rounded?: string; // e.g. "rounded-lg"
};

/**
 * Wraps next/image and shows a skeleton shimmer until the image fully loads.
 * Works with either fill or fixed width/height layouts.
 */
export default function ImageWithSkeleton({
  className,
  rounded = "rounded-md",
  ...imgProps
}: Props) {
  const [loaded, setLoaded] = useState(false);

  // If using `fill`, caller provides a relative container; otherwise width/height is required.
  return (
    <div
      className={clsx(
        "relative overflow-hidden",
        rounded,
        // Prevent layout shift if not using `fill`
        imgProps.fill ? "" : "inline-block"
      )}
      style={
        imgProps.fill
          ? undefined
          : { width: imgProps.width, height: imgProps.height }
      }
    >
      {/* Skeleton shimmer */}
      {!loaded && (
        <div
          aria-hidden
          className={clsx(
            "absolute inset-0",
            "bg-[linear-gradient(90deg,#f3f4f6_25%,#e5e7eb_37%,#f3f4f6_63%)]",
            "bg-[length:400%_100%]",
            "animate-[shimmer_1.25s_infinite_linear]"
          )}
        />
      )}

      <Image
        {...imgProps}
        className={clsx(
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoadingComplete={() => setLoaded(true)}
      />

      {/* Inline keyframes (scoped, no Tailwind config changes needed) */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
