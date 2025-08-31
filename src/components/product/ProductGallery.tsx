"use client";

import { useState } from "react";
import Image from "next/image";
import { cfImage } from "@/lib/cfImages";

type Props = {
  images: string[];              // CF IDs or full imagedelivery URLs
  productName: string;
  cfHeroVariant?: string;        // default "productHero"
  cfThumbVariant?: string;       // default "productThumb"
};

export default function ProductGallery({
  images,
  productName,
  cfHeroVariant = "productHero",
  cfThumbVariant = "productThumb",
}: Props) {
  const [active, setActive] = useState(0);

  const heroUrls = images.map((src) => cfImage(src, cfHeroVariant));
  const thumbUrls = images.map((src) => cfImage(src, cfThumbVariant));

  return (
    <div>
      {/* HERO */}
      <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-white">
        <Image
          key={active}
          src={heroUrls[active]}
          alt={productName}
          fill
          sizes="(min-width:1024px) 720px, 100vw"
          className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
          priority
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/75 to-transparent" />
      </div>

      {/* THUMBS */}
      {thumbUrls.length > 1 && (
        <ul className="mt-5 grid grid-cols-4 gap-3 sm:gap-4">
          {thumbUrls.map((u, i) => {
            const selected = i === active;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`View image ${i + 1}`}
                  className={[
                    "relative block aspect-square w-full overflow-hidden rounded-lg border transition",
                    selected ? "ring-2 ring-blue-600 ring-offset-2" : "hover:border-blue-400",
                  ].join(" ")}
                >
                  <Image src={u} alt={`${productName} ${i + 1}`} fill sizes="25vw" className="object-contain" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
