import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cartLines } from "@/db/schema/cart";

export async function PATCH(
  req: Request,
  { params }: { params: { lineId: string } }
) {
  const { side, url } = await req.json();
  if (!side || !url) return NextResponse.json({ ok: false, error: "Missing side/url" }, { status: 400 });

  const [row] = await db.select({ artwork: cartLines.artwork }).from(cartLines).where(eq(cartLines.id, params.lineId));
  const current = (row?.artwork ?? {}) as Record<string, string>;
  current[String(side)] = url;

  await db.update(cartLines).set({ artwork: current }).where(eq(cartLines.id, params.lineId));
  return NextResponse.json({ ok: true, artwork: current });
}
