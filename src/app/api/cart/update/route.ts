import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cartLines } from "@/db/schema/cart";

export async function PATCH(req: Request) {
  const { lineId, quantity } = await req.json();
  if (!lineId || !Number.isFinite(Number(quantity)) || Number(quantity) < 1) {
    return NextResponse.json({ ok: false, error: "Invalid lineId/quantity" }, { status: 400 });
  }
  await db.update(cartLines).set({ quantity: Number(quantity) }).where(eq(cartLines.id, lineId));
  return NextResponse.json({ ok: true });
}
