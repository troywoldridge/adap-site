// src/app/api/cart/lines/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
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

function sameArray(a: number[] = [], b: number[] = []) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export async function POST(req: Request) {
  const body = await req.json();

  // Accept both `quantity` and `qty` (client can send either)
  const productId = Number(body?.productId);
  const quantity = Number(body?.quantity ?? body?.qty ?? 1);
  const optionIds: number[] = Array.isArray(body?.optionIds)
    ? body.optionIds.map((n: any) => Number(n)).filter(Number.isFinite)
    : [];

  // Optional pricing (cents) — used to show line totals downstream
  const unitPriceCents = Number.isFinite(Number(body?.unitPriceCents))
    ? Number(body.unitPriceCents)
    : null;
  const lineTotalCents = Number.isFinite(Number(body?.lineTotalCents))
    ? Number(body.lineTotalCents)
    : null;

  if (!Number.isFinite(productId) || productId <= 0) {
    return noStore(NextResponse.json({ ok: false, error: "invalid_productId" }, { status: 400 }));
  }
  const qty = Math.max(1, Number.isFinite(quantity) ? quantity : 1);

  const jar = await getJar();
  const cookieA = (jar.get?.("adap_sid")?.value ?? undefined) as string | undefined;
  const cookieB = (jar.get?.("sid")?.value ?? undefined) as string | undefined;
  const candidates: string[] = [cookieA, cookieB].filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );

  // prefer an SID that already has an open cart
  let openCartSid: string | undefined;
  for (const candidate of candidates) {
    const c = await db.query.carts.findFirst({
      where: and(eq(carts.sid, candidate), eq(carts.status, "open")),
    });
    if (c) { openCartSid = candidate; break; }
  }

  // ALWAYS end up with a plain string
  const sid: string = openCartSid ?? cookieA ?? cookieB ?? crypto.randomUUID();

  // find or create cart
  let cart = await db.query.carts.findFirst({
    where: and(eq(carts.sid, sid), eq(carts.status, "open")),
  });
  if (!cart) {
    [cart] = await db.insert(carts).values({ sid, status: "open" }).returning();
  }

  // merge behavior (same productId + optionIds → bump quantity)
  const existing = await db
    .select()
    .from(cartLines)
    .where(and(eq(cartLines.cartId, cart.id), eq(cartLines.productId, Number(productId))));

  const match = existing.find((l: any) => sameArray(l.optionIds ?? [], optionIds));

  let line: any;
  let merged = false;

  if (match) {
    merged = true;
    const newQty = Number(match.quantity ?? 0) + qty;
    [line] = await db
      .update(cartLines)
      .set({
        quantity: newQty,
        // only update price fields if provided in this request
        ...(unitPriceCents != null ? { unitPriceCents } : {}),
        ...(lineTotalCents != null ? { lineTotalCents } : {}),
      })
      .where(eq(cartLines.id, match.id))
      .returning();
  } else {
    [line] = await db
      .insert(cartLines)
      .values({
        cartId: cart.id,
        productId: Number(productId),
        quantity: qty,
        optionIds: optionIds as any, // jsonb[] in your schema
        artwork: {},                 // nullable jsonb
        ...(unitPriceCents != null ? { unitPriceCents } : {}),
        ...(lineTotalCents != null ? { lineTotalCents } : {}),
      })
      .returning();
  }

  // ✅ build the FINAL response first, THEN set cookies on it
  const res = NextResponse.json({
    ok: true,
    merged,
    cartId: cart.id,
    lineId: line.id,  // <—— critical for upload page
    line,
  });
  res.cookies.set("adap_sid", sid, COOKIE_OPTS);
  res.cookies.set("sid", sid,     COOKIE_OPTS);
  return noStore(res);
}
