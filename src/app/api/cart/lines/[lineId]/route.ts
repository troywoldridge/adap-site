// src/app/api/cart/lines/[lineId]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema";

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

// Next 14 (sync) + Next 15 (async)
async function getJar() {
  const maybe = cookies() as any;
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

// Find the open cart from cookies, and sync both cookie names to the chosen SID
async function getOpenCartAndSyncCookies() {
  const res = NextResponse.json({ ok: true }); // we’ll reuse headers to carry Set-Cookie
  const jar = await getJar();

  const cookieA = (jar.get?.("adap_sid")?.value ?? undefined) as string | undefined;
  const cookieB = (jar.get?.("sid")?.value ?? undefined) as string | undefined;
  const candidates: string[] = [cookieA, cookieB].filter(
    (v): v is string => typeof v === "string" && v.length > 0
  );

  let chosen: string | undefined;
  let cartRec: any = null;

  for (const sid of candidates) {
    const found = await db.query.carts.findFirst({
      where: and(eq(carts.sid, sid), eq(carts.status, "open")),
    });
    if (found) {
      chosen = sid;
      cartRec = found;
      break;
    }
  }

  // If neither cookie had an open cart, prefer adap_sid, else sid (don’t mint here)
  if (!chosen) chosen = cookieA ?? cookieB;

  if (chosen) {
    res.cookies.set("adap_sid", chosen, COOKIE_OPTS);
    res.cookies.set("sid", chosen, COOKIE_OPTS);
  }

  return { res, cart: cartRec as any | null };
}

/** PATCH /api/cart/lines/[lineId]  body: { quantity } (or { qty }) */
export async function PATCH(req: NextRequest, { params }: { params: { lineId: string } }) {
  const { res, cart } = await getOpenCartAndSyncCookies();
  if (!cart) {
    return noStore(
      NextResponse.json({ ok: false, error: "no_open_cart" }, { status: 404, headers: res.headers })
    );
  }

  let qtyBody: any;
  try {
    qtyBody = await req.json();
  } catch {
    return noStore(
      NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400, headers: res.headers })
    );
  }

  let qty = Number(qtyBody?.quantity ?? qtyBody?.qty);
  if (!Number.isFinite(qty)) {
    return noStore(
      NextResponse.json({ ok: false, error: "invalid_quantity" }, { status: 400, headers: res.headers })
    );
  }
  qty = Math.max(1, Math.min(9999, Math.floor(qty)));

  const { lineId } = params;

  const [updated] = await db
    .update(cartLines)
    .set({ quantity: qty })
    .where(and(eq(cartLines.id, lineId), eq(cartLines.cartId, cart.id)))
    .returning();

  if (!updated) {
    return noStore(
      NextResponse.json({ ok: false, error: "line_not_found" }, { status: 404, headers: res.headers })
    );
  }

  return noStore(NextResponse.json({ ok: true, line: updated }, { headers: res.headers }));
}

/** DELETE /api/cart/lines/[lineId] */
export async function DELETE(_req: NextRequest, { params }: { params: { lineId: string } }) {
  const { res, cart } = await getOpenCartAndSyncCookies();
  if (!cart) {
    return noStore(
      NextResponse.json({ ok: false, error: "no_open_cart" }, { status: 404, headers: res.headers })
    );
  }

  const { lineId } = params;

  const [deleted] = await db
    .delete(cartLines)
    .where(and(eq(cartLines.id, lineId), eq(cartLines.cartId, cart.id)))
    .returning();

  if (!deleted) {
    return noStore(
      NextResponse.json({ ok: false, error: "line_not_found" }, { status: 404, headers: res.headers })
    );
  }

  return noStore(NextResponse.json({ ok: true }, { headers: res.headers }));
}
