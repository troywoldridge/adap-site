// src/app/api/cart/current/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { cartAttachments } from "@/db/schema/cartAttachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
  domain: COOKIE_DOMAIN,
};

function json(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

async function readSid(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get("sid")?.value ?? jar.get("adap_sid")?.value;
}
function setSid(res: NextResponse, sid: string) {
  res.cookies.set("sid", sid, COOKIE_OPTS);
  res.cookies.set("adap_sid", sid, COOKIE_OPTS);
}

export async function GET(req: NextRequest) {
  const debug = /^(1|true)$/i.test(new URL(req.url).searchParams.get("debug") || "");

  try {
    // 1) Ensure session + open cart
    let sid = await readSid();
    if (!sid) sid = crypto.randomUUID();

    let cart = await db.query.carts.findFirst({
      where: and(eq(carts.sid, sid), eq(carts.status, "open")),
      columns: { id: true, sid: true, status: true, currency: true, selectedShipping: true },
    });

    if (!cart) {
      const [created] = await db
        .insert(carts)
        .values({ sid, status: "open" })
        .returning({
          id: carts.id,
          sid: carts.sid,
          status: carts.status,
          currency: carts.currency,
          selectedShipping: carts.selectedShipping,
        });
      cart = created;
    }

    // 2) Lines (include optionIds so shipping estimator has the option chain)
    const lineRows = await db
      .select({
        id: cartLines.id,
        productId: cartLines.productId,
        quantity: cartLines.quantity as any,
        unitPriceCents: (cartLines as any).unitPriceCents,   // may be null/undefined depending on schema
        lineTotalCents: (cartLines as any).lineTotalCents,   // "
        optionIds: (cartLines as any).optionIds,             // jsonb []
        currency: (cartLines as any).currency,               // optional column
      })
      .from(cartLines)
      .where(eq(cartLines.cartId, cart.id));

    const lines = (lineRows || []).map((r) => ({
      id: String(r.id),
      productId: Number(r.productId) || 0,
      quantity: Number(r.quantity ?? 1),
      unitPriceCents: typeof r.unitPriceCents === "number" ? r.unitPriceCents : null,
      lineTotalCents: typeof r.lineTotalCents === "number" ? r.lineTotalCents : null,
      optionIds: Array.isArray(r.optionIds)
        ? r.optionIds.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n))
        : [],
      currency: (r.currency as "USD" | "CAD") ?? "USD",
    }));

    // 3) Attachments grouped by lineId
    const lineIds = lines.map((l) => l.id);
    const attachments: Record<
      string,
      Array<{
        id: string;
        fileName: string;
        key: string;
        url: string;
        thumbKey: string | null;
        thumbUrl: string | null;
        cfImageId: string | null;
      }>
    > = {};
    for (const lid of lineIds) attachments[lid] = [];

    if (lineIds.length > 0) {
      const attRows = await db
        .select({
          id: cartAttachments.id,
          lineId: cartAttachments.lineId,
          fileName: cartAttachments.fileName,
          key: cartAttachments.key,
          url: cartAttachments.url,
          thumbKey: cartAttachments.thumbKey,
          thumbUrl: cartAttachments.thumbUrl,
          cfImageId: cartAttachments.cfImageId,
        })
        .from(cartAttachments)
        .where(inArray(cartAttachments.lineId, lineIds));

      for (const a of attRows) {
        const lid = String(a.lineId);
        if (!attachments[lid]) attachments[lid] = [];
        attachments[lid].push({
          id: String(a.id),
          fileName: a.fileName,
          key: a.key,
          url: a.thumbUrl || a.url,
          thumbKey: a.thumbKey ?? null,
          thumbUrl: a.thumbUrl ?? null,
          cfImageId: a.cfImageId ?? null,
        });
      }
    }

    const payload = {
      ok: true,
      cart: {
        id: cart.id,
        sid: cart.sid,
        status: cart.status,
        currency: (cart as any).currency ?? "USD",
      },
      lines,
      attachments,
      selectedShipping: (cart as any).selectedShipping ?? null,
    };

    const res = debug
      ? new NextResponse(JSON.stringify(payload, null, 2), {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" },
        })
      : json(payload);

    setSid(res, sid);
    return res;
  } catch (e: any) {
    console.error("[/api/cart/current] failed:", e?.message, e?.stack);
    const err = {
      ok: false,
      cart: null,
      lines: [],
      attachments: {},
      selectedShipping: null,
      error: e?.message || String(e),
    };
    return debug
      ? new NextResponse(JSON.stringify(err, null, 2), {
          status: 500,
          headers: { "content-type": "application/json; charset=utf-8" },
        })
      : json(err, 500);
  }
}
