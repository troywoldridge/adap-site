// app/products/[productId]/page.tsx
import { getProductDetails } from "@/lib/sinalite.client";
import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";
import { mergeProduct } from "@/lib/mergeUtils";
import { db } from "@/lib/db";
import { artworkUploads } from "@/db/schema";
import { eq } from "drizzle-orm";

import ProductGallery from "@/components/ProductGallery";
import ProductOptionsPanel from "@/components/ProductOptionsPanel";
import ProductBreadcrumbs from "@/components/ProductBreadcrumbs";
import ProductTabs from "@/components/ProductTabs";
import RelatedProducts from "@/components/RelatedProducts";
import Stars from "@/components/Stars";
import ReviewForm from "@/components/ReviewForm";
import ProductReviews from "@/components/ProductReviews";
import ShippingEstimator from "@/components/ShippingEstimator";
import type { SinaliteShippingEstimateRequest } from "@/types/shipping";

export default async function ProductPage({
  params,
}: {
  params: { productId: string };
}) {
  const { productId } = params;
  const storeCode = process.env.NEXT_PUBLIC_STORE_CODE!;

  // 1) Product details
  const [apiProduct] = await getProductDetails(productId, storeCode);
  const merged = mergeProduct(apiProduct);

  // Normalize IDs (strings for slugs/props, numbers where required)
  const productIdStr = String(merged?.id ?? productId);
  const categoryIdStr = String((merged as any)?.category_id ?? "");
  const subcategoryIdStr = String((merged as any)?.subcategory_id ?? "");
  const categoryIdNum = Number.isFinite(Number(categoryIdStr)) ? Number(categoryIdStr) : 0;
  const subcategoryIdNum = Number.isFinite(Number(subcategoryIdStr)) ? Number(subcategoryIdStr) : 0;

  // 2) Explicit UI models to satisfy component prop types
  const categoryForUi = {
    id: categoryIdStr,                          // if your Category.id is number, switch to categoryIdNum
    name: (merged as any)?.category_name ?? "Category",
    slug: (merged as any)?.category_slug ?? undefined,
    description: (merged as any)?.category_description ?? "",
    image: (merged as any)?.category_image ?? undefined,
  };

  const subcategoryForUi = {
    id: subcategoryIdNum,                       // Subcategory often uses number ids
    name: (merged as any)?.subcategory_name ?? "Subcategory",
    slug: (merged as any)?.subcategory_slug ?? undefined,
    description: (merged as any)?.subcategory_description ?? "",
    image: (merged as any)?.subcategory_image ?? undefined,
    categoryId: categoryIdNum,                  // ✅ required, numeric
  };

  // 3) Images
  const images = merged?.image ? [merged.image] : [];

  // 4) Artwork uploads
  const uploads = await db
    .select()
    .from(artworkUploads)
    .where(eq(artworkUploads.productId, productIdStr));

  const artworkFiles = uploads.map((u) => ({
    type: "front" as const,
    url: u.fileUrl,
    fileName: u.fileName,
    fileSize: u.fileSize,
    fileType: u.fileType,
  }));

  // 5) Token
  const accessToken = await getSinaliteAccessToken();

  // 6) Demo addresses (replace later)
  const shippingInfo = {
    ShipFName: "Jane",
    ShipLName: "Doe",
    ShipEmail: "jane@example.com",
    ShipAddr: "123 Main St",
    ShipAddr2: "",
    ShipCity: "Toronto",
    ShipState: "ON",
    ShipZip: "M5V1A1",
    ShipCountry: "CA",
    ShipPhone: "4165551212",
  };
  const billingInfo = {
    BillFName: "Jane",
    BillLName: "Doe",
    BillEmail: "jane@example.com",
    BillAddr: "123 Main St",
    BillAddr2: "",
    BillCity: "Toronto",
    BillState: "ON",
    BillZip: "M5V1A1",
    BillCountry: "CA",
    BillPhone: "4165551212",
  };

  // 7) Shipping estimator orderData
  const defaultOptions =
    Array.isArray((merged as any)?.defaultOptionIds)
      ? ((merged as any).defaultOptionIds as (string | number)[])
      : Array.isArray((merged as any)?.options)
      ? ((merged as any).options as (string | number)[])
      : [];

  const orderData: SinaliteShippingEstimateRequest = {
    items: [
      {
        productId: (merged?.id as string | number) ?? productIdStr,
        options: defaultOptions,
        files: artworkFiles,
      },
    ],
    shippingInfo,
    billingInfo,
  };

  // 8) Product object for UI components
  const productForUi = {
    // spread FIRST, then override (prevents “overwritten” warnings)
    ...merged,
    id: (merged?.id as string | number) ?? productIdStr,
    name: (merged as any)?.name ?? "Product",
    image: merged?.image as string | undefined,
    rating: Number((merged as any)?.rating ?? 0),         // ✅ number
    reviewCount: Number((merged as any)?.reviewCount ?? 0),
    subtitle: (merged as any)?.subtitle ?? undefined,
    description: (merged as any)?.description ?? "",
    category_id: categoryIdStr,
    subcategory_id: subcategoryIdStr,
    sku: (merged as any)?.sku ?? undefined,
  };

  return (
    <main className="container product-detail-page">
      <ProductBreadcrumbs
        category={categoryForUi as any}
        subcategory={subcategoryForUi as any}
        product={productForUi as any}
      />

      <div className="product-detail__main flex flex-col md:flex-row gap-10">
        <div className="flex-1">
          <ProductGallery images={images} />
        </div>

        <div className="flex-1 min-w-[320px]">
          <h1 className="product-detail__title">{productForUi.name}</h1>

          {productForUi.subtitle && (
            <h2 className="product-detail__subtitle">{productForUi.subtitle}</h2>
          )}

          {Number.isFinite(productForUi.rating) && (
            <div className="flex items-center gap-2 my-2">
              <Stars rating={Number(productForUi.rating)} />
              <span className="text-xs text-muted-foreground">
                ({Number(productForUi.reviewCount)} reviews)
              </span>
            </div>
          )}

          {productForUi.description && (
            <div className="product-detail__desc">{productForUi.description}</div>
          )}

          <ProductOptionsPanel product={productForUi as any} />

          <div className="mt-6">
            <ShippingEstimator orderData={orderData} accessToken={accessToken} showSelector />
          </div>
        </div>
      </div>

      <div className="product-detail__tabs mt-10">
        <ProductTabs product={productForUi as any} />
      </div>

      <div className="mt-14">
        <ProductReviews productId={productIdStr} />
        <ReviewForm productId={productIdStr} />
      </div>

      <RelatedProducts
        currentProductId={productForUi.id as string | number}
        subcategoryId={subcategoryIdStr}
      />
    </main>
  );
}
