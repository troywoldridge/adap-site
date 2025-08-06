import Link from "next/link";
import Image from "next/image";
import categoryAssets from "@/data/categoryAssets.json";

type CategoryAsset = {
  imageId: string;
  variant: string;
  imageUrl: string;
  description: string;
};

const TOP_LEVEL = [
  "business-cards",
  "print-products",
  "large-format",
  "stationery",
  "promotional",
  "labels-and-packaging",
  "apparel",
  "sample-kits",
] as const;

export default function Navbar() {
  const navItems = TOP_LEVEL.map((slug) => {
    const asset = (categoryAssets as Record<string, CategoryAsset>)[slug];
    const cfUrl = asset.imageId
      ? `https://imagedelivery.net/${process.env.NEXT_PUBLIC_CF_ACCOUNT}/${asset.imageId}/${asset.variant}`
      : null;
    const imgSrc = cfUrl || asset.imageUrl;
    const name = slug
      .split("-")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");
    return { slug, name, href: `/category/${slug}`, imgSrc, alt: asset.description };
  });

  return (
    <header className="site-secondary-nav">
      <div className="inner container">
        <Link href="/" className="text-xl font-bold text-primary">
          Custom Print Experts
        </Link>
        <nav>
          <ul>
            {navItems.map(({ slug, name, href, imgSrc, alt }) => (
              <li key={slug}>
                <Link href={href}>
                  <Image
                    src={imgSrc}
                    alt={alt}
                    width={28}
                    height={28}
                    className="rounded-full object-cover"
                  />
                  <span>{name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
