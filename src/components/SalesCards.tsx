"use client";

import Image from "next/image";
import Link from "next/link";
import { cfImage } from "@/lib/cfImages";

export type SaleCard = {
  id: string | number;
  name: string;
  href: string;
  imageUrl: string;      // CF image ID or full imagedelivery URL
  discountLabel?: string;
  cta?: string;
};

interface Props {
  items: SaleCard[];
}

export default function SalesCards({ items }: Props) {
  if (!items?.length) return null;

  return (
    <section aria-label="Current Promotions" className="pt-6">
      <div className="mx-auto max-w-7xl px-4">
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ id, name, href, imageUrl, discountLabel = "10% OFF", cta = "Shop Now >" }) => (
            <li
              key={id}
              className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-md"
            >
              <Link href={href} className="flex h-full flex-col">
                <div className="relative mx-auto flex w-full items-center justify-center p-10">
                  {discountLabel && (
                    <span className="absolute left-0 top-0 rounded-br-lg bg-red-600 px-3 py-2 text-[11px] font-extrabold leading-none text-white shadow-sm">
                      {discountLabel}
                    </span>
                  )}

                  {/* Image area */}
                  <div className="relative h-40 w-full max-w-[320px]">
                    <Image
                      src={cfImage(imageUrl, "saleCard")}
                      alt={name}
                      fill
                      sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                      className="object-contain"
                      priority={false}
                    />
                  </div>
                </div>

                <div className="px-6 pb-6 text-center">
                  <h3 className="text-base font-semibold text-slate-800">{name}</h3>
                  <div className="mt-2 text-blue-600 text-sm font-semibold">{cta}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
