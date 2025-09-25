// src/app/api/cart/clear/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { cartCredits } from "@/db/schema/cartCredits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Keep cookie behavior consistent across your app
const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/" as const,
  secure: process.env.NODE_ENV === "production",
  // maxAge will be overridden to 0 when clearing
  maxAge: 60 * 60 * 24 * 30,
};

/** Clear cart cookies on the outgoing response */
function clearCartCookiesOnResponse(res: NextResponse) {
  res.cookies.set("sid", "", { ...COOKIE_OPTS, maxAge: 0 });
  res.cookies.set("cartId", "", { ...COOKIE_OPTS, maxAge: 0 });
}

export async function POST() {
  try {
    // Read-only cookie store
    const jar = await cookies();
    const sid = jar.get("sid")?.value ?? jar.get("adap_sid")?.value ?? null;
    const cartIdCookie = jar.get("cartId")?.value ?? null;

    // Locate an open cart by priority: cartId cookie, then sid
    let cartRow: { id: string } | null = null;

    if (cartIdCookie) {
      const [byId] =
        (await db
          .select({ id: carts.id })
          .from(carts)
          .where(and(eq(carts.id, cartIdCookie), ne(carts.status, "closed")))
          .limit(1)) ?? [];
      cartRow = byId ?? null;
    }

    if (!cartRow && sid) {
      const [bySid] =
        (await db
          .select({ id: carts.id })
          .from(carts)
          .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
          .limit(1)) ?? [];
      cartRow = bySid ?? null;
    }

    if (cartRow) {
      await db.transaction(async (tx) => {
        await tx.delete(cartLines).where(eq(cartLines.cartId, cartRow!.id));
        await tx.delete(cartCredits).where(eq(cartCredits.cartId, cartRow!.id));
        await tx.update(carts).set({ status: "closed" as any }).where(eq(carts.id, cartRow!.id));
      });
    }

    const res = NextResponse.json({ ok: true });
    clearCartCookiesOnResponse(res);
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    return res;
  } catch (e: any) {
    // Even on failure, clear cookies on the response so the UI won’t get stuck
    const res = NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 200 });
    clearCartCookiesOnResponse(res);
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    return res;
  }
}
