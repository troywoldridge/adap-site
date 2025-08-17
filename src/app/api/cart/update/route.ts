// src/app/api/cart/update/route.ts
import { NextResponse } from "next/server";
import { getOrSetSid } from "@/lib/sid";
import { getOrCreateOpenCartBySid } from "@/lib/cart";
import { db } from "@/lib/db";
import { cartLines } from "@/db/schema/cart";
import { and, eq } from "drizzle-orm";

export async function PATCH(req: Request) {
  try {
    const { lineId, quantity } = await req.json() as { lineId: string; quantity: number };
    if (!lineId || !Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }
    const sid = getOrSetSid();
    const cart = await getOrCreateOpenCartBySid(sid);
    const [row] = await db
      .update(cartLines)
      .set({ quantity, updatedAt: new Date().toISOString() })
      .where(and(eq(cartLines.id, lineId), eq(cartLines.cartId, cart.id)))
      .returning();
    if (!row) {
      return NextResponse.json({ ok: false, error: "Line not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, line: row });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Update failed" }, { status: 500 });
  }
}
