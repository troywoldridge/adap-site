// src/app/api/cart/remove/route.ts
import { NextResponse } from "next/server";
import { getOrSetSid } from "@/lib/sid";
import { getOrCreateOpenCartBySid } from "@/lib/cart";
import { db } from "@/lib/db";
import { cartLines } from "@/lib/db/schema/cart";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { lineId } = await req.json() as { lineId: string };
    if (!lineId) {
      return NextResponse.json({ ok: false, error: "Missing lineId" }, { status: 400 });
    }
    const sid = getOrSetSid();
    const cart = await getOrCreateOpenCartBySid(sid);
    const res = await db.delete(cartLines).where(and(eq(cartLines.id, lineId), eq(cartLines.cartId, cart.id)));
    return NextResponse.json({ ok: true, deleted: res.rowCount ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Remove failed" }, { status: 500 });
  }
}
