import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return res;
}

export async function DELETE(
  _req: Request,
  { params }: { params: { lineId: string } }
) {
  try {
    const lineId = params.lineId;
    if (!lineId) return noStore(NextResponse.json({ ok: false, error: "missing_lineId" }, { status: 400 }));

    const jar = await cookies();
    const sid = jar.get("sid")?.value ?? jar.get("adap_sid")?.value ?? null;
    if (!sid) return noStore(NextResponse.json({ ok: false, error: "no_sid" }, { status: 401 }));

    const [line] =
      (await db.select({ id: cartLines.id, cartId: cartLines.cartId })
        .from(cartLines)
        .where(eq(cartLines.id, lineId))
        .limit(1)) ?? [];

    if (!line) return noStore(NextResponse.json({ ok: true, deleted: false })); // idempotent

    const [cart] =
      (await db.select({ id: carts.id, sid: carts.sid, status: carts.status })
        .from(carts)
        .where(and(eq(carts.id, line.cartId), ne(carts.status, "closed")))
        .limit(1)) ?? [];

    if (!cart || cart.sid !== sid) {
      return noStore(NextResponse.json({ ok: false, error: "cart_mismatch" }, { status: 409 }));
    }

    await db.delete(cartLines).where(eq(cartLines.id, lineId));
    return noStore(NextResponse.json({ ok: true, deleted: true }));
  } catch (e: any) {
    console.error("DELETE /api/cart/lines/[lineId] failed:", e);
    return noStore(NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 }));
  }
}
