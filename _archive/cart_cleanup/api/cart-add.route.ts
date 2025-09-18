/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { carts, cartLines } from "@/lib/db/schema/cart";
import { getOrSetSid } from "@/lib/sid";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── validate/coerce
    const pid = Number(body?.productId);
    if (!Number.isFinite(pid) || pid <= 0) {
      return Response.json({ ok: false, error: "invalid productId" }, { status: 400 });
    }

    const rawOpts = Array.isArray(body?.optionIds) ? body.optionIds : [];
    const optsNum: number[] = rawOpts.map((v: any) => Number(v)).filter((n: unknown) => Number.isFinite(n));
    const optsStr: string[] = optsNum.map(String); // your schema expects text[] (string[])

    const qtyNum = Number(body?.quantity);
    const qty = Number.isFinite(qtyNum) && qtyNum > 0 ? Math.floor(qtyNum) : 1;

    // ✅ MUST await (cookies() is async in Next 14.2+)
    const sid = await getOrSetSid();

    // find or create open cart for this sid
    let cart = await db.query.carts.findFirst({
      where: and(eq(carts.sid, sid), eq(carts.status, "open")),
    });
    if (!cart) {
      const [row] = await db.insert(carts).values({ sid }).returning();
      cart = row;
    }

    // merge: same product + same exact options => bump qty
    const existing = await db
      .select()
      .from(cartLines)
      .where(and(eq(cartLines.cartId, cart.id), eq(cartLines.productId, pid)));

    const match = existing.find(
      (l) => JSON.stringify(l.optionIds ?? []) === JSON.stringify(optsStr)
    );

    if (match) {
      await db
        .update(cartLines)
        .set({ quantity: (match.quantity ?? 1) + qty })
        .where(eq(cartLines.id, match.id));
    } else {
      await db.insert(cartLines).values({
        cartId: cart.id,
        productId: pid,
        optionIds: optsStr, // ← text[] OK
        quantity: qty,
      });
    }

    // Pricing comes from Sinalite (configured price) in GET /api/cart per their docs
    return Response.json({ ok: true, cartId: cart.id });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message ?? "add to cart error" },
      { status: 500 }
    );
  }
}
