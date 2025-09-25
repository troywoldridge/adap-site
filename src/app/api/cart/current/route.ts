// src/app/api/cart/current/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { carts, cartLines, cartAttachments } from "@/db/schema";
import productAssets from "@/data/productAssets.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SID_PRIMARY = "sid";
const SID_FALLBACK = "adap_sid";

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return res;
}

async function getCookieJar() {
  const maybe = cookies() as any;
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

function toNum(u: unknown, d = 0) {
  const n = Number(u as any);
  return Number.isFinite(n) ? n : d;
}

type ProductAsset = {
  id: number;
  name?: string | null;
  cf_image_1_id?: string | null;
};
const assetById = new Map<number, ProductAsset>();
for (const raw of productAssets as ProductAsset[]) {
  if (raw && typeof (raw as any).id === "number") {
    assetById.set((raw as any).id, raw as any);
  }
}

export async function GET() {
  const jar = await getCookieJar();
  const sid =
    jar.get(SID_PRIMARY)?.value ??
    jar.get(SID_FALLBACK)?.value ??
    "";

  if (!sid) {
    return noStore(
      NextResponse.json({ cart: null, lines: [], attachments: {}, selectedShipping: null }, { status: 200 }),
    );
  }

  const openCart = await db.query.carts.findFirst({
    where: and(eq(carts.sid, sid), eq(carts.status, "open")),
  });

  if (!openCart) {
    return noStore(
      NextResponse.json({ cart: null, lines: [], attachments: {}, selectedShipping: null }, { status: 200 }),
    );
  }

  const lineRows = await db
    .select({
      lineId: cartLines.id,
      productId: cartLines.productId,
      quantity: cartLines.quantity as any,
      unitPriceCents: (cartLines as any).unitPriceCents ?? null,
      lineTotalCents: (cartLines as any).lineTotalCents ?? null,
      optionChain: (cartLines as any).optionChain ?? null,
      optionIds: (cartLines as any).optionIds ?? null,
    })
    .from(cartLines)
    .where(eq(cartLines.cartId, openCart.id));

  const lines = (lineRows || []).map((r) => {
    const pid = toNum(r.productId);
    const qty = toNum(r.quantity, 1);
    const asset = assetById.get(pid);

    const productName = asset?.name ?? null;
    const productCfImageId = asset?.cf_image_1_id ?? null;

    const unitPriceCents = r.unitPriceCents ?? null;
    const lineTotalCents =
      r.lineTotalCents ?? (typeof unitPriceCents === "number" ? unitPriceCents * qty : null);

    return {
      id: String(r.lineId),
      productId: pid,
      productName,
      productCfImageId,
      quantity: qty,
      unitPriceCents: typeof unitPriceCents === "number" ? unitPriceCents : null,
      lineTotalCents: typeof lineTotalCents === "number" ? lineTotalCents : null,
      optionChain: r.optionChain ?? null,
      optionIds: Array.isArray(r.optionIds) ? r.optionIds : [],
    };
  });

  const lineIds = lines.map((l) => l.id).filter(Boolean);
  let attachmentsByLine: Record<
    string,
    Array<{
      id: string;
      fileName: string;
      url?: string | null;
      key?: string | null;
      cfImageId?: string | null;
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
      })
      .from(cartAttachments)
      .where(inArray(cartAttachments.lineId, lineIds as any));

    for (const a of attRows) {
      const lid = String(a.lineId);
      if (!attachmentsByLine[lid]) attachmentsByLine[lid] = [];
      attachmentsByLine[lid].push({
        id: String(a.id),
        fileName: a.fileName ?? "Artwork",
        url: a.url ?? null,
        key: a.key ?? null,
        createdAt: a.createdAt ? String(a.createdAt) : null,
      });
    }
  }

  const selectedShipping =
    (openCart as any).selectedShipping ??
    (openCart as any).shipping ??
    null;

  return noStore(
    NextResponse.json({
      cart: {
        id: openCart.id,
        sid: openCart.sid,
        status: openCart.status,
        currency: (openCart as any).currency ?? "USD",
      },
      lines,
      attachments: attachmentsByLine,
      selectedShipping: selectedShipping ?? null,
    }),
  );
}
