'use client';

import Image from 'next/image';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { FC } from 'react'; 
import type { ProductImage } from '@/types/db';


type Props = {
  images: ProductImage[];
};

export default function ProductImageGallery({ images }: Props) {
  return (
    <div className="flex space-x-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 p-2">
      {images.map((img) => (
        <div key={img.id} className="relative min-w-[10rem] h-40 rounded-md overflow-hidden shadow-md border">
          <Image
            src={img.url}
            alt={img.alt ?? 'Product image'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
            priority
          />
        </div>
      ))}
    </div>
  );
}