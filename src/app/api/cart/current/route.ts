import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  try {
    const jar = await cookies();
    const sid = jar.get("sid")?.value ?? jar.get("adap_sid")?.value;

    if (!sid) {
      return NextResponse.json({ ok: true, cart: null, lines: [] });
    }

    const [cart] = await db
      .select()
      .from(carts)
      .where(and(eq(carts.sid, sid), eq(carts.status, "open")))
      .limit(1);

    if (!cart) {
      return NextResponse.json({ ok: true, cart: null, lines: [] });
    }

    const lines = await db
      .select()
      .from(cartLines)
      .where(eq(cartLines.cartId, cart.id))
      .orderBy(desc(cartLines.createdAt));

    return NextResponse.json({ ok: true, cart, lines });
  } catch (e: any) {
    console.error("GET /api/cart/current failed:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e), stack: e?.stack },
      { status: 500 }
    );
  }
}
