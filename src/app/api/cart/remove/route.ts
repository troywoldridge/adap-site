import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cartLines } from "@/db/schema/cart";

export async function POST(req: Request) {
  const { lineId } = await req.json();
  if (!lineId) return NextResponse.json({ ok: false, error: "Missing lineId" }, { status: 400 });
  await db.delete(cartLines).where(eq(cartLines.id, lineId));
  return NextResponse.json({ ok: true });
}
