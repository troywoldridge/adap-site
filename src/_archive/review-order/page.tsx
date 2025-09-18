// src/app/review-order/page.tsx
import { eq } from "drizzle-orm";
import Link from "next/link";
import Image from "@/components/ImageSafe";

import { db } from "@/lib/db";
import { cartArtwork } from "@/db/schema"; // barrel re-export
import { artworkThumbUrl, isPdfMime, safeText } from "@/lib/cdn";
import { getProductDetails } from "@/lib/sinalite.client";
import { getOrderSession } from "@/lib/session"; // returns { id, productId, totals, shipping, ... }

export const dynamic = "force-dynamic";

export default async function ReviewOrderPage() {
  // 1) Load current order session (server)
  const order = await getOrderSession();

  if (!order || !order.id || !order.productId) {
    return (
      <main className="container review-order" style={{ padding: 24 }}>
        <h1>No order in progress</h1>
        <p>
          <Link href="/" className="btn btn-primary">Start Shopping</Link>
        </p>
      </main>
    );
  }

  const orderSessionId = String(order.id);
  const productIdStr = String(order.productId);
  const storeCode = process.env.NEXT_PUBLIC_STORE_CODE || "en_us";

  // 2) Product details (best-effort; via Sinalite API docs)
  let productName = `Product ${productIdStr}`;
  let productDescription = "";
  let productImage = "";

  try {
    const [meta] = await getProductDetails(productIdStr, storeCode);
    productName = String(meta?.name ?? productName);
    productDescription = String(meta?.description ?? "");
    productImage = String((meta as any)?.image || "");
  } catch {
    // keep defaults if upstream is hiccuping
  }

  // 3) Artwork uploads: read by orderSessionId (works before a final order exists)
  let uploads: { id: number; filename: string; publicUrl: string; contentType: string | null; sideIndex: number }[] = [];
  try {
    const rows = await db
      .select({
        id: cartArtwork.id,
        filename: cartArtwork.filename,
        publicUrl: cartArtwork.publicUrl,
        contentType: cartArtwork.contentType,
        sideIndex: cartArtwork.sideIndex,
      })
      .from(cartArtwork)
      .where(eq(cartArtwork.orderSessionId, orderSessionId));

    uploads = (rows || []).sort((a, b) => (a.sideIndex ?? 0) - (b.sideIndex ?? 0));
  } catch {
    // ignore DB errors in dev
  }

  // 4) Totals & shipping from the session
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
              alt={safeText(productName, "Product")}
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

      {/* Artwork Uploads (via Cloudflare CDN; PDFs handled gracefully) */}
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Artwork</h2>

        {uploads.length ? (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            {uploads.map((u) => {
              const isPdf = isPdfMime(u.contentType || null);
              // fallback to original publicUrl if helper ever yields empty
              const thumbCandidate = artworkThumbUrl(u.publicUrl, u.contentType || null);
              const thumb = thumbCandidate || u.publicUrl;
              const label = u.filename || `Side ${u.sideIndex + 1}`;

              return (
                <li key={u.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <a href={u.publicUrl} target="_blank" rel="noreferrer" title={safeText(label, "Artwork")}>
                    <div
                      style={{
                        width: 160,
                        height: 160,
                        borderRadius: 8,
                        overflow: "hidden",
                        border: "1px solid #e5e7eb",
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isPdf ? (
                        <span style={{ fontSize: 12, fontWeight: 600 }}>PDF</span>
                      ) : (
                        <Image src={thumb} alt={safeText(label, "Artwork")} width={160} height={160} />
                      )}
                    </div>
                  </a>
                  <div
                    title={label}
                    style={{
                      fontSize: 12,
                      color: "#4b5563",
                      maxWidth: 160,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">
            No artwork uploaded yet.{" "}
            {/* we don't need to pass any query param; the upload page reads the session on the server */}
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
            <p><strong>Carrier:</strong> {shipping[0]}</p>
            <p><strong>Method:</strong> {shipping[1]}</p>
            <p><strong>Cost:</strong> {shipping[2].toLocaleString("en-US", { style: "currency", currency })}</p>
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
        <Link href={`/product/${productIdStr}`} className="btn btn-secondary">Back</Link>
        <form action={"/api/checkout"} method="POST">
          <input type="hidden" name="orderSessionId" value={orderSessionId} />
          <button type="submit" className="btn btn-primary">Proceed to payment</button>
        </form>
      </section>
    </main>
  );
}
