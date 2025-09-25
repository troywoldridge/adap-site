// src/app/cart/CartPageClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import CartSummary from "@/components/CartSummary";
import type { ShippingRate } from "@/components/CartShippingEstimator"; // estimator result shape

/* =========================================================
   Types
   ========================================================= */
type AnyItem = {
  id: string;
  productId: number;
  name?: string | null;                 // product name (prefer this)
  optionIds: number[];
  quantity: number;
  cloudflareImageId?: string | null;    // product CF image id
  serverUnitPrice?: number;             // dollars from server
  unitPrice?: number;                   // client override (dollars)
};

type SavedItem = {
  id: string;
  productId: number;
  name?: string | null;
  optionIds: number[];
  quantity: number;
  cloudflareImageId?: string | null;
  unitPrice?: number;
};

export type SelectedShipping = {
  carrier: string;
  method: string;
  cost: number; // dollars
  days: number | null;
  currency: "USD" | "CAD";
};

type ShippingLike = SelectedShipping | ShippingRate;

type Props = {
  initialItems: AnyItem[];
  currency: "USD" | "CAD";
  store: "US" | "CA";
  initialShipping: ShippingRate | null;
};

type Attachment = {
  id: string;
  fileName: string;
  url?: string | null;                 // public R2 (optionally proxied by CF)
  cfImageId?: string | null;           // if you later store Cloudflare Images id for artwork
};

type ApiCurrent = {
  cart: { id: string; sid: string; status: string; currency?: "USD" | "CAD" } | null;
  lines: Array<{
    id: string;
    productId: number;
    productName?: string | null;
    productCfImageId?: string | null;
    quantity: number;
    unitPriceCents?: number | null;    // cents, optional
    lineTotalCents?: number | null;    // cents, optional
    optionChain?: string | null;
    optionIds?: number[] | null;       // <-- NEW: carry option ids from server
  }>;
  // attachments keyed by lineId
  attachments: Record<string, Array<{ id: string; fileName: string; url?: string | null; key?: string | null; cfImageId?: string | null }>>;
  selectedShipping?: SelectedShipping | null;
};

const SAVED_KEY = "ADAP_SAVED_V1";

/* =========================================================
   Helpers
   ========================================================= */
const money = (n: number, currency: "USD" | "CAD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(n) || 0);

function cfImgUrl(id?: string | null, variant: string = "public") {
  if (!id) return null;
  const acct = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH || "pJ0fKvjCAbyoF8aD0BGu8Q";
  // served via Cloudflare Images CDN
  return `https://imagedelivery.net/${acct}/${id}/${variant}`;
}

// Normalize any incoming rate (estimator/server) into our chosen/DB shape
function toSelectedShipping(anyRate: any): SelectedShipping | null {
  if (!anyRate) return null;
  const carrier = String(anyRate.carrier ?? "");
  const method = String(anyRate.method ?? anyRate.serviceName ?? anyRate.serviceCode ?? "");
  const cost =
    typeof anyRate.cost === "number"
      ? anyRate.cost
      : Number(anyRate.amount ?? 0) || 0;
  const days =
    typeof anyRate.days === "number"
      ? anyRate.days
      : Number.isFinite(Number(anyRate.etaDays))
      ? Number(anyRate.etaDays)
      : null;
  const currency: "USD" | "CAD" = anyRate.currency === "CAD" ? "CAD" : "USD";
  if (!carrier || !method) return null;
  return { carrier, method, cost, days, currency };
}

/** Pick the best thumbnail for a line:
 *  1) If artwork attachment exists: prefer its Cloudflare Images ID, else its public URL
 *  2) Else fall back to product Cloudflare image
 */
function pickLineThumb(
  it: AnyItem,
  attMap: Record<string, Attachment[]>,
): { src: string | null; alt: string } {
  const list = attMap[it.id];
  if (list && list.length > 0) {
    const a = list[0];
    const artSrc = a.cfImageId ? cfImgUrl(a.cfImageId, "productCard") : (a.url ?? null);
    if (artSrc) {
      return { src: artSrc, alt: a.fileName || it.name || `Product ${it.productId}` };
    }
  }
  const prodSrc = cfImgUrl(it.cloudflareImageId, "productCard") || cfImgUrl(it.cloudflareImageId, "public");
  return { src: prodSrc, alt: it.name || `Product ${it.productId}` };
}

/* =========================================================
   Component
   ========================================================= */
export default function CartPageClient({ initialItems, currency, store, initialShipping }: Props) {
  const [items, setItems] = useState<AnyItem[]>(initialItems || []);
  const [selectedShipping, setSelectedShipping] = useState<ShippingLike | null>(initialShipping);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [attachmentsByLine, setAttachmentsByLine] = useState<Record<string, Attachment[]>>({});

  // Load saved list (localStorage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {}
  }, []);
  function persistSaved(next: SavedItem[]) {
    setSaved(next);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch {}
  }

  // Subtotal from authoritative serverUnitPrice (falls back to unitPrice)
  const subtotal = useMemo(
    () =>
      (items || []).reduce((sum, it) => {
        const unit =
          typeof it.serverUnitPrice === "number"
            ? it.serverUnitPrice
            : typeof it.unitPrice === "number"
            ? it.unitPrice
            : 0;
        return sum + unit * (it.quantity || 1);
      }, 0),
    [items],
  );

  // Minimal lines to feed shipping estimator
const miniLines = useMemo(
  () =>
    (items || []).map((it) => ({
      productId: it.productId,
      optionIds: Array.isArray(it.optionIds) ? it.optionIds : [],
      qty: it.quantity || 1,           // ← use `qty` (what CartSummary expects)
    })),
  [items],
);


  /** Try to load enriched cart from /api/cart/current first:
   *  Expecting fields:
   *    - lines[] with productName & productCfImageId and unitPriceCents
   *    - attachments keyed by lineId (first entry = primary artwork)
   *  Falls back to /api/cart if /current not available.
   */
  async function refreshFromServer() {
    try {
      // 1) Prefer /api/cart/current
      const res = await fetch("/api/cart/current", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as ApiCurrent;

        // Map lines to our local AnyItem shape (convert cents -> dollars if provided)
        const mapped: AnyItem[] = (json.lines || []).map((ln) => {
          const unitDollars =
            typeof ln.unitPriceCents === "number" ? ln.unitPriceCents / 100 : undefined;
          return {
            id: String(ln.id),
            productId: Number(ln.productId),
            name: ln.productName ?? null,
            optionIds: Array.isArray(ln.optionIds) ? ln.optionIds : [], // <-- FIXED: keep server optionIds
            quantity: Number(ln.quantity || 1),
            cloudflareImageId: ln.productCfImageId ?? null,
            serverUnitPrice: unitDollars,
          };
        });

        setItems(mapped);

        // attachments mapping
        const att: Record<string, Attachment[]> = {};
        for (const [lineId, list] of Object.entries(json.attachments || {})) {
          att[lineId] = (list || []).map((a) => ({
            id: String(a.id),
            fileName: a.fileName ?? "Artwork",
            url: a.url ?? undefined,
            cfImageId: (a as any).cfImageId ?? undefined,
          }));
        }
        setAttachmentsByLine(att);

        // selected shipping
        if (json.selectedShipping) {
          setSelectedShipping(toSelectedShipping(json.selectedShipping));
        }
        return; // done
      }

      // 2) Fallback: legacy /api/cart (keeps your old shape working)
      const res2 = await fetch("/api/cart", { cache: "no-store" });
      if (res2.ok) {
        const j2 = await res2.json();
        const itemsShape: AnyItem[] =
          (j2?.items as AnyItem[]) ??
          (j2?.cart?.items as AnyItem[]) ??
          [];
        const srvItems =
          itemsShape.map((it) => ({
            ...it,
            serverUnitPrice:
              typeof it.unitPrice === "number" ? it.unitPrice : it.serverUnitPrice,
          })) || [];
        setItems(srvItems);

        const srvShip: any =
          j2?.selectedShipping ??
          j2?.cart?.selectedShipping ??
          j2?.cart?.shipping ??
          null;
        setSelectedShipping(toSelectedShipping(srvShip));
      }
    } catch (e) {
      console.error("refreshFromServer error", e);
    }
  }

  useEffect(() => {
    // On mount, upgrade to enriched payload if available
    refreshFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function removeLine(lineId: string) {
    setBusyId(lineId);
    try {
      await fetch(`/api/cart/lines/${encodeURIComponent(lineId)}`, { method: "DELETE", cache: "no-store" });
      await refreshFromServer();
    } finally {
      setBusyId(null);
    }
  }

  async function updateQty(lineId: string, qty: number) {
    qty = Math.max(1, Math.min(9999, Math.floor(qty)));
    setBusyId(lineId);
    try {
      await fetch(`/api/cart/lines/${encodeURIComponent(lineId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quantity: qty }),
        cache: "no-store",
      });
      await refreshFromServer();
    } finally {
      setBusyId(null);
    }
  }

  // Save locally, remove from cart
  async function saveForLater(line: AnyItem) {
    setBusyId(line.id);
    try {
      const snapshotUnit =
        typeof line.serverUnitPrice === "number"
          ? line.serverUnitPrice
          : typeof line.unitPrice === "number"
          ? line.unitPrice
          : undefined;

      const next: SavedItem = {
        id: crypto.randomUUID(),
        productId: line.productId,
        name: line.name,
        optionIds: Array.isArray(line.optionIds) ? line.optionIds : [],
        quantity: Number(line.quantity || 1),
        cloudflareImageId: line.cloudflareImageId ?? null,
        unitPrice: snapshotUnit,
      };
      persistSaved([next, ...saved]);

      await fetch(`/api/cart/lines/${encodeURIComponent(line.id)}`, { method: "DELETE", cache: "no-store" });
      await refreshFromServer();
    } finally {
      setBusyId(null);
    }
  }

  async function moveToCart(si: SavedItem) {
    try {
      await fetch("/api/cart/lines", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: si.productId,
          optionIds: si.optionIds,
          quantity: si.quantity,
        }),
        cache: "no-store",
      });
      persistSaved(saved.filter((x) => x.id !== si.id));
      await refreshFromServer();
    } catch {}
  }
  function removeSaved(si: SavedItem) { persistSaved(saved.filter((x) => x.id !== si.id)); }

  // When the user chooses a rate in the estimator/summary, persist it server-side
  async function onChangeShipping(rate: any /* preview or chosen */) {
    const chosen = toSelectedShipping(rate);
    setSelectedShipping(chosen);
    try {
      await fetch("/api/cart/shipping/choose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(chosen ?? {}),
        cache: "no-store",
      });
      await refreshFromServer();
    } catch {}
  }

  /* =========================================================
     Render
     ========================================================= */
  return (
    <main className="cart2">
      <h1 className="sr-only" id="cart-heading">Your Cart</h1>

      <div className="cart2__grid">
        {/* LEFT: items */}
        <section aria-label="Cart items" className="cart2__left">
          {items.length === 0 ? (
            <div className="card text-center">
              <h2 className="m-0">Your cart is empty</h2>
              <p className="muted mt-1">Let’s fix that. Find something awesome to print!</p>
              <a href="/" className="btn primary mt-3">Continue shopping</a>
            </div>
          ) : (
            <ul className="cart2__list">
              {items.map((it) => {
                const unit =
                  typeof it.serverUnitPrice === "number"
                    ? it.serverUnitPrice
                    : typeof it.unitPrice === "number"
                    ? it.unitPrice
                    : 0;

                const lineTotal = unit * (it.quantity || 1);

                const thumb = pickLineThumb(it, attachmentsByLine);
                const displayName = it.name || `Product ${it.productId}`;

                return (
                  <li key={it.id} className="cart2__row card">
                    <div className="cart2__rowGrid">
                      {/* thumb: prefers artwork if present */}
                      <div className="cart2__thumb" aria-hidden="true">
                        {thumb.src ? (
                          <img
                            className="cart2__thumbImg"
                            src={thumb.src}
                            alt={thumb.alt}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="cart2__thumbImg" />
                        )}
                      </div>

                      {/* main */}
                      <div className="minw0">
                        <div className="cart2__name">{displayName}</div>
                        <div className="cart2__each">
                          {unit ? `${money(unit, currency)} each` : "$0.00 each"}
                        </div>

                        <div className="cart2__qtyWrap">
                          <label htmlFor={`qty-${it.id}`}>Qty</label>
                          <input
                            id={`qty-${it.id}`}
                            type="number"
                            min={1}
                            value={it.quantity}
                            disabled={busyId === it.id}
                            onChange={(e) => updateQty(it.id, Number(e.currentTarget.value))}
                            className="cart2__qtyInput"
                            aria-label={`Quantity for ${displayName}`}
                          />
                        </div>

                        <button
                          onClick={() => saveForLater(it)}
                          disabled={busyId === it.id}
                          className="link-btn"
                          aria-label={`Save ${displayName} for later`}
                        >
                          Save for later
                        </button>
                      </div>

                      {/* right */}
                      <div className="cart2__rowRight">
                        <div className="cart2__lineTotal">{money(lineTotal, currency)}</div>
                        <button
                          onClick={() => removeLine(it.id)}
                          disabled={busyId === it.id}
                          className="link-dim"
                          aria-label={`Remove ${displayName}`}
                        >
                          {busyId === it.id ? "Removing…" : "Remove"}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Saved for later */}
          {saved.length > 0 && (
            <div className="card mt-6" aria-label="Saved for later">
              <h3 className="m-0">Saved for later</h3>
              <ul className="cart2__list mt-3">
                {saved.map((si) => {
                  const img = cfImgUrl(si.cloudflareImageId, "productCard") || cfImgUrl(si.cloudflareImageId, "public");
                  return (
                    <li key={si.id} className="cart2__savedRow">
                      <div className="cart2__rowGrid">
                        <div className="cart2__thumb" aria-hidden="true">
                          {img ? (
                            <img
                              className="cart2__thumbImg"
                              src={img}
                              alt={si.name ?? `Product ${si.productId}`}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="cart2__thumbImg" />
                          )}
                        </div>
                        <div className="minw0">
                          <div className="cart2__name">{si.name || `Product ${si.productId}`}</div>
                          <div className="cart2__each">
                            {typeof si.unitPrice === "number"
                              ? `${money(si.unitPrice, currency)} each`
                              : "Price shown at checkout"}
                          </div>
                          <div className="muted mt-1">Qty: {si.quantity}</div>
                        </div>
                        <div className="cart2__savedActions">
                          <button className="btn primary" onClick={() => moveToCart(si)}>
                            Move to cart
                          </button>
                          <button className="link-dim" onClick={() => removeSaved(si)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        {/* RIGHT: summary with estimator */}
        <aside className="cart2__right" aria-label="Order summary">
          <div className="card">
            <CartSummary
              currency={currency}
              subtotal={subtotal}
              lines={miniLines}
              store={store}
              selectedShipping={selectedShipping as any}
              onChangeShipping={onChangeShipping as any}
            />
          </div>
        </aside>
      </div>

      {/* ===== scoped CSS ===== */}
      <style jsx global>{`
        .cart2{max-width:1400px;margin:0 auto;padding:24px 16px}
        .cart2__grid{display:grid;gap:24px}
        @media (min-width:1024px){ .cart2__grid{grid-template-columns:58% 42%} }
        @media (min-width:1280px){ .cart2__grid{grid-template-columns:60% 40%} }
        @media (min-width:1536px){ .cart2__grid{grid-template-columns:62% 38%} }

        .cart2__left{min-width:0}
        .cart2__right{position:sticky;top:96px;align-self:start}
        .cart2__right > .card,
        .cart2__right .order-summary,
        .cart2__right .estimator{width:100%}

        .cart2{--ink:#0f172a;--muted:#64748b}
        .cart2, .cart2 *{font-size:14px;color:var(--ink)}
        .muted{color:var(--muted)}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,.06)}
        .btn{display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 16px;border-radius:10px;border:1px solid transparent;font-weight:700;cursor:pointer}
        .btn.primary{background:#1e40af;color:#fff}
        .btn.primary:hover{filter:brightness(.98)}
        .link-btn{background:none;border:0;padding:0;margin-top:8px;color:#1d4ed8;font-weight:600;cursor:pointer}
        .link-dim{background:none;border:0;padding:0;margin-top:8px;color:#475569;cursor:pointer}
        .minw0{min-width:0}

        .cart2__list{list-style:none;margin:0;padding:0;display:grid;gap:12px}
        .cart2__rowGrid{display:grid;grid-template-columns:96px 1fr auto;gap:12px;align-items:start}
        .cart2__thumb{width:96px;height:96px;background:#f1f5f9;border-radius:8px;overflow:hidden}
        .cart2__thumbImg{width:100%;height:100%;object-fit:cover}
        .cart2__name{font:700 15px/1.15 system-ui,Segoe UI,Roboto,Helvetica,Arial;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .cart2__each{font-size:12px;color:var(--muted);margin-top:2px}
        .cart2__qtyWrap{display:flex;align-items:center;gap:8px;margin-top:8px}
        .cart2__qtyWrap label{font-size:12px;color:#334155}
        .cart2__qtyInput{height:36px;width:80px;border:1px solid #e5e7eb;border-radius:8px;padding:0 8px;box-sizing:border-box;font-size:14px}
        .cart2__rowRight{text-align:right}
        .cart2__lineTotal{font-weight:800}

        .cart2__savedRow{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px}
        .cart2__savedActions{display:flex;flex-direction:column;align-items:end;gap:8px}
      `}</style>
    </main>
  );
}
