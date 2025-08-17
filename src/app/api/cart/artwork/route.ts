// src/app/api/cart/artwork/route.ts
import { NextResponse } from "next/server";
import { getOrSetSid } from "@/lib/sid";
import { getOrCreateOpenCartBySid } from "@/lib/cart";
import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema/cart";
import { and, eq } from "drizzle-orm";

export async function PATCH(req: Request) {
  try {
    const { lineId, side, url } = await req.json() as { lineId: string; side: number; url: string };
    if (!lineId || !Number.isFinite(side) || !url) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const sid = getOrSetSid();
    const cart = await getOrCreateOpenCartBySid(sid);

    // get current artwork record
    const row = await db.query.cartLines.findFirst({
      where: and(eq(cartLines.id, lineId), eq(cartLines.cartId, cart.id)),
      columns: { id: true, artwork: true },
    });
    if (!row) {
      return NextResponse.json({ ok: false, error: "Line not found" }, { status: 404 });
    }

    const artwork = (row.artwork ?? {}) as Record<string, string>;
    artwork[String(side)] = url;

    const [updated] = await db
      .update(cartLines)
      .set({ artwork, updatedAt: new Date().toISOString() })
      .where(eq(cartLines.id, lineId))
      .returning();
    return NextResponse.json({ ok: true, line: updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Save failed" }, { status: 500 });
  }
}
