// src/app/cart/review/page.tsx
import "server-only";
import Image from "next/image";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { carts, cartLines, cartAttachments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { cfUrl } from "@/lib/data";
import CartShippingEstimator, { type ShippingRate } from "@/components/CartShippingEstimator";

/* ────────── utils ────────── */
const SID_COOKIE = "sid";

function toNumArray(u: unknown): number[] {
  if (!Array.isArray(u)) return [];
  const out: number[] = [];
  for (const v of u) {
    const n = Number(v as any);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}
function toMoney(n: unknown): number {
  const x = Number(n as any);
  return Number.isFinite(x) ? x : 0;
}
function fmtCurrency(value: number, currency: "USD" | "CAD" = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/* ────────── data load ────────── */
async function loadCart() {
  const jar = await cookies();
  const sid = jar.get(SID_COOKIE)?.value || "";

  const cart = await db.query.carts.findFirst({
    where: and(eq(carts.sid, sid), eq(carts.status, "open")),
  });

  if (!cart) {
    return {
      id: "",
      currency: "USD" as const,
      store: "US" as const,
      lines: [] as any[],
      subtotal: 0,
      selectedShipping: null as ShippingRate | null,
    };
  }

  const lines = await db.query.cartLines.findMany({
    where: eq(cartLines.cartId, cart.id),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

  const lineIds = lines.map((l) => l.id);
  const attachments = lineIds.length
    ? await db.query.cartAttachments.findMany({
        where: (fields, { inArray }) => inArray(fields.lineId, lineIds.map(String)),
      })
    : [];

  const enriched = lines.map((l) => {
    const optionIds = toNumArray(l.optionIds);
    const unit = toMoney((l as any).unitPrice ?? (l as any).price ?? 0);
    const qty = Math.max(1, Number(l.quantity) || 1);
    const lineTotal = unit * qty;

    const attachmentsForLine = attachments.filter((a) => a.lineId === String(l.id));

    return {
      id: l.id,
      productId: l.productId,
      optionIds,
      quantity: qty,
      unitPrice: unit,
      lineTotal,
      optionsByGroup: (l as any).optionsByGroup || {},
      artworkMap: (l as any).artwork || {},
      attachments: attachmentsForLine,
    };
  });

  const subtotal = enriched.reduce((sum, it) => sum + it.lineTotal, 0);
  const currency: "USD" | "CAD" = "USD";

  const rawShip = (cart as any)?.selectedShipping || null;
  const selectedShipping: ShippingRate | null = rawShip
    ? {
        carrier: String(rawShip.carrier ?? ""),
        method: String(rawShip.method ?? ""),
        cost: Number(rawShip.cost ?? 0) || 0,
        days: typeof rawShip.days === "number" ? rawShip.days : null,
        currency: rawShip.currency === "CAD" ? "CAD" : "USD",
      }
    : null;

  const store: "US" | "CA" = rawShip?.country === "CA" ? "CA" : "US";

  return { id: cart.id, currency, store, lines: enriched, subtotal, selectedShipping };
}

/* ────────── page ────────── */
export default async function ReviewCartPage() {
  const { lines, subtotal, currency, store, selectedShipping } = await loadCart();

  const estimateLines = lines.map((l) => ({
    productId: l.productId,
    optionIds: l.optionIds,
    quantity: l.quantity,
  }));

  return (
    <main className="reviewpg">
      <header className="reviewpg__header">
        <h1 className="reviewpg__title">Review Your Order</h1>
        <div className="reviewpg__meta">
          {lines.length > 0 ? `${lines.length} item${lines.length > 1 ? "s" : ""}` : "No items"}
        </div>
      </header>

      {lines.length === 0 && (
        <section className="reviewpg__empty" aria-label="Empty cart">
          Your cart is empty. Browse products and add items to continue.
        </section>
      )}

      {lines.length > 0 && (
        <section className="reviewpg__grid">
          {/* Left: lines */}
          <div className="reviewpg__lines">
            {lines.map((l) => (
              <article key={l.id} className="reviewpg__card reviewpg__line">
                <div className="reviewpg__lineHeader">
                  <div className="reviewpg__prod">Product #{l.productId}</div>
                  <div className="reviewpg__figs">
                    <div className="reviewpg__kv">
                      <span className="dim">Qty:</span> {l.quantity}
                    </div>
                    <div className="reviewpg__kv">
                      <span className="dim">Unit:</span> {fmtCurrency(l.unitPrice, currency)}
                    </div>
                    <div className="reviewpg__kv">
                      <span className="dim">Line total:</span>{" "}
                      <strong>{fmtCurrency(l.lineTotal, currency)}</strong>
                    </div>
                  </div>
                </div>

                {/* Options */}
                {l.optionsByGroup && Object.keys(l.optionsByGroup).length > 0 && (
                  <dl className="reviewpg__opts">
                    {Object.entries(l.optionsByGroup).map(([k, v]) => (
                      <div key={k}>
                        <dt className="reviewpg__optKey">{k}</dt>{" "}
                        <dd className="reviewpg__optVal">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {/* Artwork / uploads */}
                {l.attachments && l.attachments.length > 0 ? (
                  <ul className="reviewpg__gallery">
                    {l.attachments.map((a: any) => {
                      const url = cfUrl(a.storageId);
                      return (
                        <li key={a.id} className="reviewpg__galItem">
                          <div className="reviewpg__galImg">
                            <Image
                              src={url}
                              alt={a.fileName || "Artwork"}
                              fill
                              sizes="176px"
                              className="img-cover"
                            />
                          </div>
                          <div className="reviewpg__galCaption">{a.fileName || "Artwork"}</div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-4" style={{ color: "var(--text-dim)", fontSize: 12 }}>
                    No artwork attached yet.
                  </p>
                )}
              </article>
            ))}
          </div>

          {/* Right: summary + shipping */}
          <aside className="reviewpg__card reviewpg__summary order-summary" aria-label="Order summary">
            <h2 className="reviewpg__sumTitle">Order Summary</h2>
            <div className="reviewpg__sumKV">
              <span className="dim">Subtotal</span>
              <span>{fmtCurrency(subtotal, currency)}</span>
            </div>
            <p className="dim" style={{ fontSize: 12 }}>
              Taxes and shipping are calculated at checkout.
            </p>
            <div className="reviewpg__shipCard mt-4 estimator estimator--compact">
  <CartShippingEstimator
    lines={estimateLines}
    store={store}
    selected={selectedShipping}
  />
</div>

<a href="/checkout" className="btn btn-primary checkout-btn reviewpg__cta">
  Continue to checkout
</a>

          
          </aside>
        </section>
      )}
    </main>
  );
}
