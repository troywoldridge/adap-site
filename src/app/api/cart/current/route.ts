// src/app/api/cart/current/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { carts, cartLines, cartAttachments } from "@/db/schema";

// 🔹 We don't have a products table; load product info from JSON assets
import productAssets from "@/data/productAssets.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SID_COOKIE = "sid";

// Handle no-store cache
function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return res;
}

// Next 14 (sync) + Next 15 (async) cookie helper
async function getCookieJar() {
  const maybe = cookies() as any;
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

// Small helper to safely coerce numbers
function toNum(u: unknown, d = 0) {
  const n = Number(u as any);
  return Number.isFinite(n) ? n : d;
}

// Build a quick lookup: productId -> { name, cfImageId }
type ProductAsset = {
  id: number;
  name?: string | null;
  cf_image_1_id?: string | null;
  // ...other fields ignored
};
const assetById = new Map<number, ProductAsset>();
for (const raw of productAssets as ProductAsset[]) {
  if (raw && typeof raw.id === "number") {
    assetById.set(raw.id, raw);
  }
}

export async function GET() {
  // 🧯 Fixes: "Property 'get' does not exist on type 'Promise<ReadonlyRequestCookies>'"
  const jar = await getCookieJar();
  const sid = jar.get(SID_COOKIE)?.value ?? "";

  if (!sid) {
    return noStore(
      NextResponse.json(
        { cart: null, lines: [], attachments: {}, selectedShipping: null },
        { status: 200 },
      ),
    );
  }

  // 1) Find open cart for this sid
  const openCart = await db.query.carts.findFirst({
    where: and(eq(carts.sid, sid), eq(carts.status, "open")),
  });

  if (!openCart) {
    return noStore(
      NextResponse.json(
        { cart: null, lines: [], attachments: {}, selectedShipping: null },
        { status: 200 },
      ),
    );
  }

  // 2) Pull lines (no SQL join to products; we'll enrich from JSON)
  const lineRows = await db
    .select({
      lineId: cartLines.id,
      productId: cartLines.productId,
      quantity: cartLines.quantity as any,          // adapt to your schema
      unitPriceCents: (cartLines as any).unitPriceCents ?? null,  // optional
      lineTotalCents: (cartLines as any).lineTotalCents ?? null,  // optional
      optionChain: (cartLines as any).optionChain ?? null,        // optional
    })
    .from(cartLines)
    .where(eq(cartLines.cartId, openCart.id));

  // 3) Enrich lines from productAssets.json
  const lines = (lineRows || []).map((r) => {
    const pid = toNum(r.productId);
    const qty = toNum(r.quantity, 1);
    const asset = assetById.get(pid);

    const productName = asset?.name ?? null;
    const productCfImageId = asset?.cf_image_1_id ?? null;

    // cents -> keep as-is for clients that want it; UI can convert
    const unitPriceCents = r.unitPriceCents ?? null;
    const lineTotalCents =
      r.lineTotalCents ?? (typeof unitPriceCents === "number" ? unitPriceCents * qty : null);

    return {
      id: String(r.lineId),
      productId: pid,
      productName,           // ✅ name now available without a DB table
      productCfImageId,      // ✅ first CF image id
      quantity: qty,
      unitPriceCents: typeof unitPriceCents === "number" ? unitPriceCents : null,
      lineTotalCents: typeof lineTotalCents === "number" ? lineTotalCents : null,
      optionChain: r.optionChain ?? null,
    };
  });

  // 4) Attachments per line (uploaded artwork)
  const lineIds = lines.map((l) => l.id).filter(Boolean);
  let attachmentsByLine: Record<
    string,
    Array<{
      id: string;
      fileName: string;
      url?: string | null;
      key?: string | null;
      cfImageId?: string | null; // if you later generate Cloudflare Images thumbnails
      createdAt?: string | null;
    }>
  > = {};

  if (lineIds.length > 0) {
    const attRows = await db
      .select({
        id: cartAttachments.id,
        lineId: cartAttachments.lineId,
        fileName: cartAttachments.fileName,
        url: cartAttachments.url,
        key: cartAttachments.key,
        createdAt: cartAttachments.createdAt as any,
        // If you add a CF image id column later, map it here:
        // cfImageId: (cartAttachments as any).cfImageId ?? null,
      })
      .from(cartAttachments)
      .where(inArray(cartAttachments.lineId, lineIds as any));

    for (const a of attRows) {
      const lid = String(a.lineId);
      if (!attachmentsByLine[lid]) attachmentsByLine[lid] = [];
      attachmentsByLine[lid].push({
        id: String(a.id),
        fileName: a.fileName ?? "Artwork",
        url: a.url ?? null,          // R2 public or Cloudflare-proxied URL
        key: a.key ?? null,
        // cfImageId: (a as any).cfImageId ?? null, // keep commented until you add the column
        createdAt: a.createdAt ? String(a.createdAt) : null,
      });
    }
  }

  // 5) Selected shipping (if you persist it on carts)
  const selectedShipping =
    (openCart as any).selectedShipping ??
    (openCart as any).shipping ??
    null;

  // 6) Response
  return noStore(
    NextResponse.json({
      cart: {
        id: openCart.id,
        sid: openCart.sid,
        status: openCart.status,
        currency: (openCart as any).currency ?? "USD",
      },
      lines,
      attachments: attachmentsByLine, // keyed by lineId
      selectedShipping: selectedShipping ?? null,
    }),
  );
}
