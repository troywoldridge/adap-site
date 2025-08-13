// app/review-order/page.tsx
import Link from "next/link";
import { eq, and } from "drizzle-orm"; // ✅ and for combined WHERE

import { db } from "@/lib/db";
import { artworkUploads } from "@/db/schema";
import { getOrderSession } from "@/lib/session";
import { getProductDetails } from "@/lib/sinalite.client"; // per Sinalite API docs
import { mergeProduct } from "@/lib/mergeUtils";
import ProductGallery from "@/components/ProductGallery";
import Stars from "@/components/Stars";
import { createCheckoutSession } from "./actions";
import type { Category, Subcategory } from "@/types/catalog";

export default async function ReviewOrderPage() {
  const orderSession = await getOrderSession();
  if (!orderSession?.productId) {
    return (
      <main className="container review-order">
        <h1>No order in progress</h1>
        <p>
          <Link href="/" className="btn btn-primary">Start Shopping</Link>
        </p>
      </main>
    );
  }

  const orderId = String(orderSession.id);
  const storeCode = process.env.NEXT_PUBLIC_STORE_CODE!;

  // Product (SinaLite API → merged)
  const [apiProduct] = await getProductDetails(orderSession.productId, storeCode);
  const merged = mergeProduct(apiProduct);

  const productIdStr = String(merged?.id ?? orderSession.productId);
  const categoryId = (merged as any)?.category_id ?? "";
  const subcategoryId = (merged as any)?.subcategory_id ?? "";

  const category: Category = {
    id: categoryId,
    slug: (merged as any)?.category_slug ?? "category",
    name: (merged as any)?.category_name ?? "Category",
    description: (merged as any)?.category_description ?? "",
    image: (merged as any)?.category_image ?? undefined,
  };

  const subcategory: Subcategory = {
    id: subcategoryId,
    slug: (merged as any)?.subcategory_slug ?? "subcategory",
    name: (merged as any)?.subcategory_name ?? "Subcategory",
    categoryId,
    description: (merged as any)?.subcategory_description ?? "",
    image: (merged as any)?.subcategory_image ?? undefined,
  };

  // ✅ Only show artwork for THIS order + product
  const uploads = await db
    .select()
    .from(artworkUploads)
    .where(
      and(
        eq(artworkUploads.productId, productIdStr),
        eq(artworkUploads.orderId, orderId)
      )
    );

  // Gallery (served via Cloudflare Images/CDN)
  const images = merged?.image ? [merged.image] : [];

  // Shipping tuple
  const shipping = orderSession.selectedShippingRate as
    | [carrier: string, service: string, price: number, available: number]
    | undefined;

  // Totals
  const currency = orderSession.currency || "USD";
  const subtotal = Number(orderSession.subtotal || 0);
  const shippingCost = Number(shipping?.[2] || 0);
  const tax = Number(orderSession.tax || 0);
  const discount = Number(orderSession.discount || 0);
  const grandTotal = Math.max(subtotal + shippingCost + tax - discount, 0);

  // Product UI bits
  const productName = (merged as any)?.name ?? "Product";
  const productDescription = (merged as any)?.description ?? "";
  const productRating = Number((merged as any)?.rating ?? 0);
  const productReviewCount = Number((merged as any)?.reviewCount ?? 0);

  // ✅ Routes (singular) + preserve orderId
  const editProductHref = `/product/${productIdStr}`;
  const uploadHref = `/product/${productIdStr}/upload-artwork?orderId=${encodeURIComponent(orderId)}`;

  return (
    <main className="container review-order">
      <h1>Review Your Order</h1>

      {/* Product Summary */}
      <section className="card">
        <h2>Product</h2>
        <div className="row">
          <div className="col-media">
            <ProductGallery images={images} />
          </div>
          <div className="col-main">
            <h3>{productName}</h3>
            {Number.isFinite(productRating) && (
              <div className="rating-row">
                <Stars rating={productRating} />
                <span>({productReviewCount} reviews)</span>
              </div>
            )}
            {productDescription && <p>{productDescription}</p>}
            <div className="meta">
              <div><strong>Category:</strong> {category.name}</div>
              <div><strong>Subcategory:</strong> {subcategory.name}</div>
              <div>
                <strong>Options:</strong>{" "}
                {Array.isArray(orderSession.options) && orderSession.options.length
                  ? orderSession.options.join(", ")
                  : "—"}
              </div>
            </div>
            <div className="actions">
              <Link href={editProductHref} className="link">Edit Product</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Artwork Uploads */}
      <section className="card">
        <h2>Artwork</h2>
        {uploads.length ? (
          <ul className="file-list">
            {uploads.map((file) => (
              <li key={file.id} className="file">
                <span>{file.fileName}</span>
                <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="link">
                  View
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            No artwork uploaded yet.{" "}
            <Link href={uploadHref} className="link">Upload now</Link>
          </p>
        )}
      </section>

      {/* Shipping */}
      <section className="card">
        <h2>Shipping</h2>
        {shipping ? (
          <>
            <p><strong>Carrier:</strong> {shipping[0]}</p>
            <p><strong>Method:</strong> {shipping[1]}</p>
            <p><strong>Cost:</strong> {shippingCost.toLocaleString("en-US", { style: "currency", currency })}</p>
            <div className="actions">
              <Link href={editProductHref} className="link">Change Shipping</Link>
            </div>
          </>
        ) : (
          <p className="muted">No shipping method selected.</p>
        )}
      </section>

      {/* Addresses */}
      <section className="card">
        <h2>Addresses</h2>
        <div className="grid-2">
          <div>
            <h3>Shipping Address</h3>
            <p>{orderSession.shippingInfo?.ShipFName} {orderSession.shippingInfo?.ShipLName}</p>
            <p>{orderSession.shippingInfo?.ShipAddr}</p>
            <p>{orderSession.shippingInfo?.ShipCity}, {orderSession.shippingInfo?.ShipState} {orderSession.shippingInfo?.ShipZip}</p>
            <p>{orderSession.shippingInfo?.ShipCountry}</p>
            <p>{orderSession.shippingInfo?.ShipPhone}</p>
          </div>
          <div>
            <h3>Billing Address</h3>
            <p>{orderSession.billingInfo?.BillFName} {orderSession.billingInfo?.BillLName}</p>
            <p>{orderSession.billingInfo?.BillAddr}</p>
            <p>{orderSession.billingInfo?.BillCity}, {orderSession.billingInfo?.BillState} {orderSession.billingInfo?.BillZip}</p>
            <p>{orderSession.billingInfo?.BillCountry}</p>
            <p>{orderSession.billingInfo?.BillPhone}</p>
          </div>
        </div>
      </section>

      {/* Totals */}
      <section className="card">
        <h2>Totals</h2>
        <div className="totals">
          <div className="row"><span>Subtotal</span><span>{subtotal.toLocaleString("en-US", { style: "currency", currency })}</span></div>
          <div className="row"><span>Shipping</span><span>{shippingCost.toLocaleString("en-US", { style: "currency", currency })}</span></div>
          <div className="row"><span>Tax</span><span>{tax.toLocaleString("en-US", { style: "currency", currency })}</span></div>
          {!!discount && <div className="row discount"><span>Discount</span><span>-{discount.toLocaleString("en-US", { style: "currency", currency })}</span></div>}
          <hr />
          <div className="row total"><span>Total</span><span>{grandTotal.toLocaleString("en-US", { style: "currency", currency })}</span></div>
        </div>
      </section>

      {/* Final Actions */}
      <section className="final-actions">
        <Link href={editProductHref} className="btn btn-secondary">Back</Link>
        <form action={createCheckoutSession}>
          <input type="hidden" name="orderSessionId" value={orderId} />
          <button
            type="submit"
            className="btn btn-primary"
            // Optional safety: require artwork before paying
            // disabled={!uploads.length}
          >
            Proceed to Payment
          </button>
        </form>
      </section>
    </main>
  );
}
