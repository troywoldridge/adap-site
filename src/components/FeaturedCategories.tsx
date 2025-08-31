"use client";

import Link from "next/link";
import Image from "next/image";
import { cfImage } from "@/lib/cfImages";

export interface FeaturedCategory {
  slug: string;
  name: string;
  imageUrl: string;   // Cloudflare image ID or full imagedelivery URL
  href: string;
  description?: string;
}

interface Props {
  categories: FeaturedCategory[];
  limit?: number; // default 3
}

export default function FeaturedCategories({ categories, limit = 3 }: Props) {
  if (!categories?.length) return null;
  const items = categories.slice(0, limit);

  return (
    <section aria-label="Shop by Category">
      <div className="mx-auto max-w-7xl px-4">
        <ul className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
          {items.map(({ slug, name, imageUrl, href }) => (
            <li
              key={slug}
              className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <Link href={href} title={name} className="flex h-full flex-col">
                <div className="relative w-full aspect-square p-4">
                  <Image
                    src={cfImage(imageUrl, "category")}
                    alt={name}
                    fill
                    sizes="(min-width:640px) 33vw, 100vw"
                    className="object-contain"
                    priority={false}
                  />
                </div>

                <div className="px-4 pb-5 pt-2 text-center">
                  <h3 className="text-base font-semibold text-slate-800">{name}</h3>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
