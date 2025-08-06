// src/app/products/[id]/[slug]/page.tsx
import slugify from "slugify";
import { notFound } from "next/navigation";
import {
  listProducts,
  getProductDetails,
  priceProduct,
  ProductSummary,
} from "@/lib/sinalite";
import ClientOptionsSection from "./ClientOptionsSection";
import ProductImageGallery from "@/components/ProductImageGallery";    // ← import here
import imageMap from "@/data/imageMap.json";

export const revalidate = 60;
const STORE_CODE = "en_us";

function getImageUrls(productId: number): string[] {
  const cfAccount = process.env.NEXT_PUBLIC_CF_ACCOUNT!;
  const rows = (imageMap as Array<{
    product_id: string;
    cloudflare_id: string;
  }>).filter((r) => Number(r.product_id) === productId);
  if (!rows.length) {
    return ["/images/placeholder.jpg"];
  }
  return rows.map(
    (r) => `https://imagedelivery.net/${cfAccount}/${r.cloudflare_id}/public`
  );
}

export async function generateStaticParams() {
  const prods = await listProducts();
  return prods.map((p) => ({
    id: p.id.toString(),
    slug: slugify(p.name, { lower: true, strict: true }),
  }));
}

export default async function ProductPage({
  params,
}: {
  params: { id: string; slug: string };
}) {
  const productId = parseInt(params.id, 10);

  // 1) Validate slug & fetch summary
  const all: ProductSummary[] = await listProducts();
  const summary = all.find((p) => p.id === productId);
  if (
    !summary ||
    slugify(summary.name, { lower: true, strict: true }) !== params.slug
  ) {
    notFound();
  }

  // 2) Fetch detail arrays: [options, pricingVals, metadata]
  const [optionsArr, pricingArr, metaArr] = await getProductDetails(
    productId,
    STORE_CODE
  );

  // Group options by 'group' field
  const groups = optionsArr.reduce<Record<string, Array<{ id: number; name: string }>>>(
    (acc, opt: any) => {
      if (!acc[opt.group]) {
        acc[opt.group] = [];
      }
      acc[opt.group].push({ id: opt.id, name: opt.name });
      return acc;
    },
    {}
  );

  // 3) Default one per group
  const defaultOptionIds = Object.values(groups).map((grp) => grp[0].id);

  // 4) Fetch initial pricing
  const { price, packageInfo, productOptions } = await priceProduct(
    productId,
    STORE_CODE,
    defaultOptionIds
  );

  // 5) Build images from your map
  const images = getImageUrls(productId);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Name */}
      <h1 className="text-3xl md:text-4xl font-bold">{summary.name}</h1>

      {/* Product Image Gallery */}
      <ProductImageGallery images={images} altText={summary.name} />

      {/* Pricing & Package Info */}
      <div className="bg-gray-50 p-6 rounded-lg shadow space-y-2">
        <h2 className="text-xl font-semibold">Price & Package</h2>
        <p>
          <span className="font-medium">Price:</span> ${parseFloat(price).toFixed(2)}
        </p>
        <p>
          <span className="font-medium">Package Info:</span>{" "}
          {Object.entries(packageInfo)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")}
        </p>
      </div>

      {/* Options Picker & Live Pricing */}
      <ClientOptionsSection
        productId={productId}
        storeCode={STORE_CODE}
        optionGroups={groups}
        initialSelected={defaultOptionIds}
        initialPrice={price}
        initialPackageInfo={packageInfo}
        initialOptionsMap={productOptions}
      />
    </div>
  );
}
