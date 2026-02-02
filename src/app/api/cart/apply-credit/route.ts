import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbClient as db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartCredits } from "@/db/schema/cartCredits";
import { and, eq } from "drizzle-orm";

const SID_COOKIE = "sid";

export async function POST(req: Request) {
  const { amount } = await req.json().catch(() => ({ amount: 0 }));
  // amount is dollars; store cents
  const cents = Math.max(0, Math.round(Number(amount) * 100));
  if (!Number.isFinite(cents)) {
    return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 });
  }

  // Read cookies (async, read-only in route handlers)
  const jar = await cookies();
  let sid =
    jar.get(SID_COOKIE)?.value ??
    jar.get("adap_sid")?.value ??
    "";

  let needSetCookie = false;
  if (!sid) {
    sid = crypto.randomUUID();
    needSetCookie = true; // must set via response
  }

  // find or create open cart by sid
  let [cart] =
    (await db
      .select()
      .from(carts)
      .where(and(eq(carts.sid, sid), eq(carts.status, "open")))
      .limit(1)) || [];

  if (!cart) {
    const [created] = await db
      .insert(carts)
      .values({ sid, status: "open" } as any)
      .returning();
    cart = created;
  }

  // Upsert the loyalty credit for this cart (one record per source='loyalty')
  const existing =
    (await db
      .select()
      .from(cartCredits)
      .where(and(eq(cartCredits.cartId, cart.id), eq(cartCredits.source, "loyalty")))
      .limit(1)) || [];

  let body: any = { ok: true, creditCents: cents };

  if (cents === 0) {
    if (existing.length > 0) {
      await db.delete(cartCredits).where(eq(cartCredits.id, existing[0].id));
    }
    body = { ok: true, creditCents: 0 };
  } else if (existing.length === 0) {
    await db
      .insert(cartCredits)
      .values({ cartId: cart.id, source: "loyalty", amountCents: cents } as any);
  } else {
    await db
      .update(cartCredits)
      .set({ amountCents: cents })
      .where(eq(cartCredits.id, existing[0].id));
  }

  // Create response and (if needed) set the cookie on the response
  const res = NextResponse.json(body);
  if (needSetCookie) {
    res.cookies.set(SID_COOKIE, sid, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  return res;
}
