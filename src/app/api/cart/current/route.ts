// src/app/api/cart/current/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return res;
}

// Support Next 14 (sync) + Next 15 (async)
async function getJar() {
  const maybe = cookies() as any;
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

export async function GET(_req: NextRequest) {
  try {
    // Start with a response so we can attach Set-Cookie reliably
    let res = NextResponse.json({
      ok: true,
      cart: null as any,
      lines: [] as any[],
      subtotal: 0,
      lineCount: 0,
    });

    const jar = await getJar();
    const cookieA = (jar.get?.("adap_sid")?.value ?? undefined) as string | undefined;
    const cookieB = (jar.get?.("sid")?.value ?? undefined) as string | undefined;

    // Gather non-empty candidates
    const candidates: string[] = [cookieA, cookieB].filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );

    // Choose the SID that actually has an open cart
    let chosen: string | undefined;
    let foundCart: any = null;

    for (const sid of candidates) {
      const c = await db.query.carts.findFirst({
        where: and(eq(carts.sid, sid), eq(carts.status, "open")),
      });
      if (c) {
        chosen = sid;
        foundCart = c;
        break;
      }
    }

    // If neither cookie has a cart yet, pick a stable fallback (prefer adap_sid, else sid),
    // but DO NOT create a new SID on GET. We'll still sync both cookie names to the chosen value.
    if (!chosen) {
      chosen = cookieA ?? cookieB;
    }

    // If we have *any* chosen SID, sync both cookies so the browser stops diverging
    if (chosen) {
      res.cookies.set("adap_sid", chosen, COOKIE_OPTS);
      res.cookies.set("sid", chosen, COOKIE_OPTS);
    }

    // If we didn't find a cart, return empty (read endpoints shouldn't create carts)
    if (!foundCart) {
      return noStore(res);
    }

    // Load lines for the cart we actually found
    const lines = await db
      .select()
      .from(cartLines)
      .where(eq(cartLines.cartId, foundCart.id))
      .orderBy(desc(cartLines.createdAt));

    // You’re not storing price yet — keep subtotal safe (0) until Sinalite pricing is wired
    const subtotal = 0;

    res = NextResponse.json(
      { ok: true, cart: foundCart, lines, subtotal, lineCount: lines.length },
      { headers: res.headers }, // preserve Set-Cookie
    );
    return noStore(res);
  } catch (e: any) {
    console.error("GET /api/cart/current failed:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e), stack: e?.stack },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
