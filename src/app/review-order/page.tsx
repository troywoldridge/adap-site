// app/review-order/page.tsx
import Link from "next/link";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { artworkUploads } from "@/db/schema";
import { getOrderSession } from "@/lib/session";
import { getProductDetails } from "@/lib/sinalite.client";
import { mergeProduct, mergeCategory, mergeSubcategory } from "@/lib/mergeUtils";
import ProductGallery from "@/components/ProductGallery";
import Stars from "@/components/Stars";
import { createCheckoutSession } from "./actions";

export default async function ReviewOrderPage() {
  // 1) Order session (productId, options, shippingInfo, billingInfo, selectedShippingRate, totals, etc.)
  const orderSession = await getOrderSession();
  if (!orderSession?.productId) {
    return (
      <main className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">No order in progress</h1>
        <Link href="/" className="btn btn-primary">Start Shopping</Link>
      </main>
    );
  }

  const storeCode = process.env.NEXT_PUBLIC_STORE_CODE!;
  const [apiProduct] = await getProductDetails(orderSession.productId, storeCode);
  const product = mergeProduct(apiProduct);
  const subcategory = mergeSubcategory({ id: product.subcategory_id });
  const category = mergeCategory({ id: product.category_id });

  // 2) Artwork uploads for this product (optionally filter by userId/orderSessionId if you store it)
  const uploads = await db
    .select()
    .from(artworkUploads)
    .where(eq(artworkUploads.productId, String(product.id)));

  // 3) Display data
  const images = product.image ? [product.image] : [];
  const shipping = orderSession.selectedShippingRate as [string, string, number, number] | undefined; // [carrier, service, price, availableFlag]

  // Totals (assumed set in orderSession by your pricing flow)
  const currency = orderSession.currency || "USD";
  const subtotal = Number(orderSession.subtotal || 0);
  const shippingCost = Number(shipping?.[2] || 0);
  const tax = Number(orderSession.tax || 0);
  const discount = Number(orderSession.discount || 0);
  const grandTotal = Math.max(subtotal + shippingCost + tax - discount, 0);

  return (
    <main className="container py-10 review-order-page">
      <h1 className="text-3xl font-bold mb-8">Review Your Order</h1>

      {/* Product Summary */}
      <section className="bg-white shadow-sm rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Product</h2>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/3">
            <ProductGallery images={images} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{product.name}</h3>
            {product.rating && (
              <div className="flex items-center gap-2 mt-1">
                <Stars rating={product.rating} />
                <span className="text-sm text-neutral-500">
                  ({product.reviewCount} reviews)
                </span>
              </div>
            )}
            <p className="mt-2 text-neutral-700">{product.description}</p>
            <div className="mt-4">
              <strong>Category:</strong> {category.name}<br />
              <strong>Subcategory:</strong> {subcategory.name}<br />
              <strong>Options:</strong>{" "}
              {Array.isArray(orderSession.options) && orderSession.options.length
                ? orderSession.options.join(", ")
                : "—"}
            </div>
            <div className="mt-4">
              <Link href={`/products/${product.id}`} className="text-blue-600 underline">
                Edit Product
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Artwork Uploads */}
      <section className="bg-white shadow-sm rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Artwork</h2>
        {uploads.length ? (
          <ul className="space-y-3">
            {uploads.map((file) => (
              <li key={file.id} className="flex items-center justify-between border-b pb-2">
                <span>{file.fileName}</span>
                <a
                  href={file.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-neutral-500">
            No artwork uploaded yet.{" "}
            <Link href={`/products/${product.id}/upload-artwork`} className="text-blue-600 underline">
              Upload now
            </Link>
          </p>
        )}
      </section>

      {/* Shipping */}
      <section className="bg-white shadow-sm rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Shipping</h2>
        {shipping ? (
          <>
            <p><strong>Carrier:</strong> {shipping[0]}</p>
            <p><strong>Method:</strong> {shipping[1]}</p>
            <p><strong>Cost:</strong> {shipping[2].toLocaleString("en-US", { style: "currency", currency })}</p>
            <div className="mt-4">
              <Link href={`/products/${product.id}`} className="text-blue-600 underline">
                Change Shipping
              </Link>
            </div>
          </>
        ) : (
          <p className="text-neutral-500">No shipping method selected.</p>
        )}
      </section>

      {/* Addresses */}
      <section className="bg-white shadow-sm rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Addresses</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold">Shipping Address</h3>
            <p>{orderSession.shippingInfo?.ShipFName} {orderSession.shippingInfo?.ShipLName}</p>
            <p>{orderSession.shippingInfo?.ShipAddr}</p>
            <p>{orderSession.shippingInfo?.ShipCity}, {orderSession.shippingInfo?.ShipState} {orderSession.shippingInfo?.ShipZip}</p>
            <p>{orderSession.shippingInfo?.ShipCountry}</p>
            <p>{orderSession.shippingInfo?.ShipPhone}</p>
          </div>
          <div>
            <h3 className="font-semibold">Billing Address</h3>
            <p>{orderSession.billingInfo?.BillFName} {orderSession.billingInfo?.BillLName}</p>
            <p>{orderSession.billingInfo?.BillAddr}</p>
            <p>{orderSession.billingInfo?.BillCity}, {orderSession.billingInfo?.BillState} {orderSession.billingInfo?.BillZip}</p>
            <p>{orderSession.billingInfo?.BillCountry}</p>
            <p>{orderSession.billingInfo?.BillPhone}</p>
          </div>
        </div>
      </section>

      {/* Totals */}
      <section className="bg-white shadow-sm rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Totals</h2>
        <div className="space-y-2">
          <div className="flex justify-between"><span>Subtotal</span><span>{subtotal.toLocaleString("en-US", { style: "currency", currency })}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{shippingCost.toLocaleString("en-US", { style: "currency", currency })}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{tax.toLocaleString("en-US", { style: "currency", currency })}</span></div>
          {!!discount && <div className="flex justify-between text-green-700"><span>Discount</span><span>-{discount.toLocaleString("en-US", { style: "currency", currency })}</span></div>}
          <hr className="my-2" />
          <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>{grandTotal.toLocaleString("en-US", { style: "currency", currency })}</span></div>
        </div>
      </section>

      {/* Final Actions */}
      <section className="flex items-center justify-between mt-10">
        <Link href={`/products/${product.id}`} className="btn btn-secondary">Back</Link>
        <form action={createCheckoutSession}>
          <input type="hidden" name="orderSessionId" value={orderSession.id} />
          <button type="submit" className="btn btn-primary">Proceed to Payment</button>
        </form>
      </section>
    </main>
  );
}
