import { getProductDetails } from "@/lib/sinalite.client";
import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";
import { mergeProduct, mergeCategory, mergeSubcategory } from "@/lib/mergeUtils";
import { db } from "@/lib/db"; // Or wherever your DB query helper is
import { artworkUploads } from "@/db/schema"; // Your table schema
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

export default async function ProductPage({ params, searchParams }: {
  params: { productId: string },
  searchParams?: { [key: string]: string }
}) {
  const { productId } = params;
  const storeCode = process.env.NEXT_PUBLIC_STORE_CODE!;

  // 1. Fetch product details
  const [apiProduct] = await getProductDetails(productId, storeCode);
  const product = mergeProduct(apiProduct);

  // 2. Fetch subcategory/category
  const subcategory = mergeSubcategory({ id: product.subcategory_id });
  const category = mergeCategory({ id: product.category_id });

  // 3. Prepare images
  const images = product.image ? [product.image] : [];

  // 4. Fetch user's uploaded artwork for this product (update user/session logic as needed)
  // Example: Get all uploads for this product. In real prod, filter by logged-in user.
  const uploads = await db
    .select()
    .from(artworkUploads)
    .where(({ productId }) => productId.eq(product.id));

  const artworkFiles = uploads.map(upload => ({
    type: "front", // Or get actual type from your upload if you support more
    url: upload.fileUrl,
    fileName: upload.fileName,
    fileSize: upload.fileSize,
    fileType: upload.fileType
  }));

  // 5. Securely get access token for Sinalite
  const accessToken = await getSinaliteAccessToken();

  // 6. Use real or default shipping/billing info
  // TODO: Replace with logged-in user/session data!
  const shippingInfo = {
    ShipFName: "Jane",
    ShipLName: "Doe",
    ShipEmail: "jane@example.com",
    ShipAddr: "123 Main St",
    ShipCity: "Toronto",
    ShipState: "ON",
    ShipZip: "M5V1A1",
    ShipCountry: "CA",
    ShipPhone: "4165551212"
  };
  const billingInfo = {
    BillFName: "Jane",
    BillLName: "Doe",
    BillEmail: "jane@example.com",
    BillAddr: "123 Main St",
    BillCity: "Toronto",
    BillState: "ON",
    BillZip: "M5V1A1",
    BillCountry: "CA",
    BillPhone: "4165551212"
  };

  // 7. Wire up orderData for shipping estimator, INCLUDING ARTWORK FILES!
  const orderData: SinaliteShippingEstimateRequest = {
    items: [
      {
        productId: product.id,
        options: product.defaultOptionIds || [],
        files: artworkFiles // Fully production, real artwork uploads!
      }
    ],
    shippingInfo,
    billingInfo
  };

  return (
    <main className="container product-detail-page">
      <ProductBreadcrumbs category={category} subcategory={subcategory} product={product} />
      <div className="product-detail__main flex flex-col md:flex-row gap-10">
        <div className="flex-1">
          <ProductGallery images={images} />
        </div>
        <div className="flex-1 min-w-[320px]">
          <h1 className="product-detail__title">{product.name}</h1>
          {product.subtitle && (
            <h2 className="product-detail__subtitle">{product.subtitle}</h2>
          )}
          {product.rating && (
            <div className="flex items-center gap-2 my-2">
              <Stars rating={product.rating} />
              <span className="text-xs text-muted-foreground">
                ({product.reviewCount} reviews)
              </span>
            </div>
          )}
          <div className="product-detail__desc">{product.description}</div>
          <ProductOptionsPanel product={product} />
          {/* Live Shipping Estimate—now includes artwork files */}
          <div className="mt-6">
            <ShippingEstimator
              orderData={orderData}
              accessToken={accessToken}
              showSelector
            />
          </div>
        </div>
      </div>
      <div className="product-detail__tabs mt-10">
        <ProductTabs product={product} />
      </div>
      <div className="mt-14">
        <ProductReviews productId={product.id} />
        <ReviewForm productId={product.id} />
      </div>
      <RelatedProducts
        currentProductId={product.id}
        subcategoryId={product.subcategory_id}
      />
    </main>
  );
}

