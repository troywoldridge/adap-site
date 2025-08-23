import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema";
import { and, eq } from "drizzle-orm";

function asIntArray(x: unknown): number[] {
  if (!Array.isArray(x)) {
    return [];
  }
  return x.map((n) => Number(n)).filter((n) => Number.isFinite(n));
}

function arraysEqual(a: number[] | null | undefined, b: number[]): boolean {
  if (!a || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const productId = Number(body?.productId);
    const quantity = Math.max(1, Number(body?.quantity ?? 1));
    const optionIds = asIntArray(body?.optionIds);
    if (!Number.isFinite(productId)) {
      return NextResponse.json({ ok: false, error: "Invalid productId" }, { status: 400 });
    }

    // SESSION COOKIE (async API)
    const jar = await cookies();
    let sid = jar.get("sid")?.value ?? jar.get("adap_sid")?.value;
    const createdSid = !sid;
    if (!sid) sid = randomUUID();

    // Ensure open cart
    let [cart] = await db
      .select()
      .from(carts)
      .where(and(eq(carts.sid, sid), eq(carts.status, "open")))
      .limit(1);

    if (!cart) {
      [cart] = await db
        .insert(carts)
        .values({ sid, status: "open" as const })
        .onConflictDoNothing()
        .returning();

      if (!cart) {
        [cart] = await db
          .select()
          .from(carts)
          .where(and(eq(carts.sid, sid), eq(carts.status, "open")))
          .limit(1);
      }
      if (!cart) {
        return NextResponse.json({ ok: false, error: "Could not create cart" }, { status: 500 });
      }
    }

    // Merge duplicate (same product + same optionIds)
    const candidates = await db
      .select({ id: cartLines.id, quantity: cartLines.quantity, optionIds: cartLines.optionIds })
      .from(cartLines)
      .where(and(eq(cartLines.cartId, cart.id), eq(cartLines.productId, productId)));

    const existing = candidates.find((r) => arraysEqual(r.optionIds as any, optionIds));

    let payload: any;
    if (existing) {
      const newQty = (existing.quantity ?? 1) + quantity;
      const [updated] = await db
        .update(cartLines)
        .set({ quantity: newQty, updatedAt: new Date() as any })
        .where(eq(cartLines.id, existing.id))
        .returning();
      payload = { ok: true, merged: true, line: updated, cartId: cart.id };
    } else {
      const [inserted] = await db
        .insert(cartLines)
        .values({ cartId: cart.id, productId, quantity, optionIds: optionIds as any } as any)
        .returning();
      payload = { ok: true, merged: false, line: inserted, cartId: cart.id };
    }

    const res = NextResponse.json(payload);

    // IMPORTANT: set both cookie names for compatibility
    if (createdSid) {
      // use response cookies helper (works with Next 15)
      res.cookies.set("sid", sid, { httpOnly: true, sameSite: "lax", path: "/" });
      res.cookies.set("adap_sid", sid, { httpOnly: true, sameSite: "lax", path: "/" });
    }

    return res;
  } catch (e: any) {
    console.error("POST /api/cart/lines failed:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e), stack: e?.stack },
      { status: 500 }
    );
  }
}
