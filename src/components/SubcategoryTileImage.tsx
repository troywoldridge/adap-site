// Server Component
import ImageSafe from "@/components/ImageSafe";
import { cfImage } from "@/lib/cfImages";

export default function SubcategoryTileImage({ idOrUrl, alt }: { idOrUrl: string; alt: string }) {
  // If it’s a CF image ID, turn it into a full URL on the server
  const src = idOrUrl.startsWith("http")
    ? idOrUrl
    : cfImage(idOrUrl, "productCard"); // or "categoryThumb" etc.

  // Since src is absolute, you can drop the custom loader entirely:
  return (
    <div className="relative w-full aspect-[4/3] overflow-hidden rounded-lg">
      <ImageSafe
        src={src}          // already a full imagedelivery.net URL
        alt={alt}
        fill
        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 360px"
        // no loader prop needed
      />
    </div>
  );
}
