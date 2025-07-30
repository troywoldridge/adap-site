import { Image, ProductImage } from '@/types/db';

export function toProductImages(images: Image[]): ProductImage[] {
  return images.map((img) => ({
    id: String(img.id),
    url: img.url,
    alt: img.alt ?? "Product image",
  }));
}


