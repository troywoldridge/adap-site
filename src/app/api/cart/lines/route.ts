// src/app/api/cart/lines/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema";
import { computePrice } from "@/lib/price/compute";

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

function sameArray(a: number[] = [], b: number[] = []) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

async function getOpenCartBySid(sid: string) {
  const [row] =
    (await db
      .select({
        id: carts.id,
        sid: carts.sid,
        status: carts.status,
        currency: carts.currency,
        selectedShipping: carts.selectedShipping,
      })
      .from(carts)
      .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
      .limit(1)) ?? [];
  return row ?? null;
}

async function getAnyCartBySid(sid: string) {
  const [row] =
    (await db
      .select({ id: carts.id, sid: carts.sid, status: carts.status })
      .from(carts)
      .where(eq(carts.sid, sid))
      .limit(1)) ?? [];
  return row ?? null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const productId = Number(body?.productId);
  const quantity = Math.max(1, Number(body?.quantity ?? body?.qty ?? 1) || 1);
  const store: "US" | "CA" = body?.store === "CA" ? "CA" : "US";
  const optionIds: number[] = Array.isArray(body?.optionIds)
    ? body.optionIds.map((n: any) => Number(n)).filter(Number.isFinite)
    : [];

  if (!Number.isFinite(productId) || productId <= 0) {
    return noStore(NextResponse.json({ ok: false, error: "invalid_productId" }, { status: 400 }));
  }
  if (optionIds.length === 0) {
    return noStore(NextResponse.json({ ok: false, error: "missing_optionIds" }, { status: 400 }));
  }

  // ✅ Server-authoritative pricing per SinaLite API documentation
  const priced = await computePrice({ productId, store, quantity, optionIds });

  // Read cookies
  const jar = await cookies();
  const cookieSid = jar.get("sid")?.value ?? jar.get("adap_sid")?.value ?? undefined;

  // Try to use the existing open cart for the cookie SID
  let cart =
    (cookieSid && (await getOpenCartBySid(cookieSid))) ||
    null;

  let sid = cart?.sid ?? cookieSid;
  let sidChanged = false;

  if (!cart) {
    // No open cart found. Prefer creating a cart with the SAME cookie SID (so we don't change cookies).
    // If DB says that SID already exists (23505), fetch it; if it's closed, create with a new SID.
    const trySid = sid ?? crypto.randomUUID();
    try {
      const [inserted] = await db
        .insert(carts)
        .values({ sid: trySid, status: "open" as any, currency: priced.currency })
        .returning({
          id: carts.id,
          sid: carts.sid,
          status: carts.status,
          currency: carts.currency,
          selectedShipping: carts.selectedShipping,
        });
      cart = inserted;
      sid = inserted.sid;
    } catch (e: any) {
      if (String(e?.code) === "23505") {
        // SID exists: if there's an OPEN cart, use it; if it's CLOSED, rotate to a new SID and create again
        const open = await getOpenCartBySid(trySid);
        if (open) {
          cart = open;
          sid = open.sid;
        } else {
          const any = await getAnyCartBySid(trySid);
          if (any && any.status === "closed") {
            // rotate
            const newSid = crypto.randomUUID();
            const [inserted2] = await db
              .insert(carts)
              .values({ sid: newSid, status: "open" as any, currency: priced.currency })
              .returning({
                id: carts.id,
                sid: carts.sid,
                status: carts.status,
                currency: carts.currency,
                selectedShipping: carts.selectedShipping,
              });
            cart = inserted2;
            sid = inserted2.sid;
            sidChanged = true;
          } else {
            throw e;
          }
        }
      } else {
        throw e;
      }
    }
  } else if (!cart.currency) {
    await db.update(carts).set({ currency: priced.currency }).where(eq(carts.id, cart.id));
    cart.currency = priced.currency;
  }

  // Merge: same product + same optionIds => bump quantity
  const existing = await db
    .select()
    .from(cartLines)
    .where(and(eq(cartLines.cartId, cart.id), eq(cartLines.productId, Number(productId))));

  const match = existing.find((l: any) => sameArray(l.optionIds ?? [], optionIds));

  let line: any;
  let merged = false;

  if (match) {
    merged = true;
    const newQty = Math.max(1, Number(match.quantity ?? 0) + quantity);
    [line] = await db
      .update(cartLines)
      .set({
        quantity: newQty,
        currency: priced.currency,
        unitPriceCents: priced.unitSellCents,
        lineTotalCents: priced.unitSellCents * newQty,
        updatedAt: new Date(),
      })
      .where(eq(cartLines.id, match.id))
      .returning();
  } else {
    [line] = await db
      .insert(cartLines)
      .values({
        cartId: cart.id,
        productId: Number(productId),
        quantity,
        optionIds: optionIds as any, // json/int[] per your schema
        currency: priced.currency,
        unitPriceCents: priced.unitSellCents,
        lineTotalCents: priced.unitSellCents * quantity,
        artwork: {},
      })
      .returning();
  }

  // Response
  const res = NextResponse.json({
    ok: true,
    merged,
    cartId: cart.id,
    lineId: line.id,
    line,
  });

  // If we created a cart or rotated SID, ensure the browser has the correct SID.
  if (!cookieSid || sidChanged || cookieSid !== sid) {
    res.cookies.set("sid", sid!, COOKIE_OPTS);
    res.cookies.set("adap_sid", sid!, COOKIE_OPTS);
  }

  return noStore(res);
}
