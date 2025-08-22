/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema/cart";
import { getOrSetSid } from "@/lib/sid";

type Body = {
  productId: number;
  name?: string | null;
  optionIds: number[];
  quantity: number;
  cloudflareImageId?: string | null;
};

async function ensureOpenCart() {
  const sid = await getOrSetSid();
  let cart = await db.query.carts.findFirst({
    where: and(eq(carts.sid, sid), eq(carts.status, "open")),
  });
  if (!cart) {
    const [row] = await db.insert(carts).values({ sid }).returning();
    cart = row;
  }
  return cart.id;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const productId = Number(body?.productId);
    const quantity = Math.max(1, Math.min(9999, Number(body?.quantity ?? 1)));
    const optionIds = Array.isArray(body?.optionIds)
      ? body.optionIds.map((x) => Number(x)).filter((n) => Number.isFinite(n))
      : [];

    if (!Number.isFinite(productId) || productId <= 0) {
      return NextResponse.json({ ok: false, error: "productId required" }, { status: 400 });
    }
    if (optionIds.length === 0) {
      return NextResponse.json({ ok: false, error: "optionIds[] required" }, { status: 400 });
    }

    const cartId = await ensureOpenCart();
    const lineId = crypto.randomUUID();

    // ✅ insert artwork as {} (never null) to satisfy NOT NULL schemas
    await db.insert(cartLines).values({
      id: lineId,
      cartId,
      productId,
      quantity,
      optionIds,       // jsonb<number[]>
      artwork: {},     // <— this is the key change
    });

    return NextResponse.json({
      ok: true,
      line: {
        id: lineId,
        productId,
        quantity,
        optionIds,
        image: body?.cloudflareImageId ?? null,
        name: body?.name ?? null,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
