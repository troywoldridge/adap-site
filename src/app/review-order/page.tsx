// src/app/review-order/page.tsx
import Image from "next/image";
import Link from "next/link";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { artworkUploads } from "@/db/schema";
import { getOrderSession } from "@/lib/session";
import { getProductDetails } from "@/lib/sinalite.client";
import { createCheckoutSession } from "./actions";

export const dynamic = "force-dynamic";

export default async function ReviewOrderPage() {
  // 1) Load the current order session
  const order = await getOrderSession();

  if (!order || !order.productId) {
    return (
      <main className="container review-order" style={{ padding: 24 }}>
        <h1>No order in progress</h1>
        <p>
          <Link href="/" className="btn btn-primary">
            Start Shopping
          </Link>
        </p>
      </main>
    );
  }

  const productIdStr = String(order.productId);
  const storeCode = process.env.NEXT_PUBLIC_STORE_CODE || "en_us";

  // 2) Product details (best-effort; tolerate upstream issues)
  let productName = `Product ${productIdStr}`;
  let productDescription = "";
  let productImage = "";

  try {
    const [meta] = await getProductDetails(productIdStr, storeCode);
    productName = String(meta?.name ?? productName);
    productDescription = String(meta?.description ?? "");
    productImage = String((meta as any)?.image ?? "");
  } catch {
    // keep defaults
  }

  // 3) Artwork uploads for this product (map to minimal UI shape)
  let uploads: { id: string; fileName: string; fileUrl: string }[] = [];
  try {
    const rows = await db
      .select()
      .from(artworkUploads)
      .where(eq(artworkUploads.productId, productIdStr));

    uploads = (rows || []).map((u) => ({
      id: String(u.id),
      fileName: String(u.fileName || "Artwork"),
      fileUrl: String(u.fileUrl || "#"),
    }));
  } catch {
    // ignore DB errors in dev
  }

  // 4) Totals
  const shipping = order.selectedShippingRate as
    | [carrier: string, method: string, price: number, days: number]
    | undefined;

  const currency = order.currency || "USD";
  const subtotal = Number(order.subtotal || 0);
  const shippingCost = Number(shipping?.[2] || 0);
  const tax = Number(order.tax || 0);
  const discount = Number(order.discount || 0);
  const grandTotal = Math.max(subtotal + shippingCost + tax - discount, 0);

  return (
    <main className="container review-order" style={{ padding: 24 }}>
      <h1>Review Your Order</h1>

      {/* Product Summary */}
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Product</h2>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16 }}>
          <div style={{ position: "relative", width: 120, height: 90, background: "#f5f5f5" }}>
            <Image
              src={productImage || "https://placehold.co/240x180?text=Product"}
              alt={productName}
              fill
              style={{ objectFit: "cover" }}
            />
          </div>
          <div>
            <h3 style={{ margin: "0 0 6px" }}>{productName}</h3>
            {productDescription && <p className="muted">{productDescription}</p>}
            <div className="actions" style={{ marginTop: 8 }}>
              <Link className="link" href={`/product/${productIdStr}`}>
                Edit product
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Artwork Uploads */}
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Artwork</h2>
        {uploads.length ? (
          <ul className="file-list">
            {uploads.map((u) => (
              <li key={u.id} className="file">
                <span>{u.fileName}</span>{" "}
                <a className="link" href={u.fileUrl} target="_blank" rel="noopener noreferrer">
                  View
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            No artwork uploaded yet.{" "}
            <Link className="link" href={`/product/${productIdStr}/upload-artwork`}>
              Upload now
            </Link>
          </p>
        )}
      </section>

      {/* Shipping */}
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Shipping</h2>
        {shipping ? (
          <>
            <p>
              <strong>Carrier:</strong> {shipping[0]}
            </p>
            <p>
              <strong>Method:</strong> {shipping[1]}
            </p>
            <p>
              <strong>Cost:</strong>{" "}
              {shipping[2].toLocaleString("en-US", { style: "currency", currency })}
            </p>
          </>
        ) : (
          <p className="muted">No shipping method selected.</p>
        )}
      </section>

      {/* Totals */}
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Totals</h2>
        <div className="totals">
          <div className="row">
            <span>Subtotal</span>
            <span>{subtotal.toLocaleString("en-US", { style: "currency", currency })}</span>
          </div>
          <div className="row">
            <span>Shipping</span>
            <span>{shippingCost.toLocaleString("en-US", { style: "currency", currency })}</span>
          </div>
          <div className="row">
            <span>Tax</span>
            <span>{tax.toLocaleString("en-US", { style: "currency", currency })}</span>
          </div>
          {!!discount && (
            <div className="row">
              <span>Discount</span>
              <span>-{discount.toLocaleString("en-US", { style: "currency", currency })}</span>
            </div>
          )}
          <hr />
          <div className="row total">
            <span>Total</span>
            <span>{grandTotal.toLocaleString("en-US", { style: "currency", currency })}</span>
          </div>
        </div>
      </section>

      {/* Final actions */}
      <section className="final-actions" style={{ marginTop: 20, display: "flex", gap: 12 }}>
        <Link href={`/product/${productIdStr}`} className="btn btn-secondary">
          Back
        </Link>
        <form action={createCheckoutSession}>
          <input type="hidden" name="orderSessionId" value={order.id} />
          <button type="submit" className="btn btn-primary">
            Proceed to payment
          </button>
        </form>
      </section>
    </main>
  );
}
