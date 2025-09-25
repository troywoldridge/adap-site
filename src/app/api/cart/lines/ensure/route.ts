// src/app/api/cart/lines/ensure/route.ts
import "server-only";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------- cookie helpers ---------- */
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined; // e.g. ".adapnow.com"
const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
  domain: COOKIE_DOMAIN,
};

function attachSidCookie(res: NextResponse, sid: string) {
  res.cookies.set("adap_sid", sid, COOKIE_OPTS);
  res.cookies.set("sid", sid, COOKIE_OPTS);
}

async function readOrCreateSid(): Promise<{ sid: string; created: boolean }> {
  const jar = await cookies();
  const existing = jar.get("adap_sid")?.value ?? jar.get("sid")?.value;
  if (existing) return { sid: existing, created: false };
  return { sid: crypto.randomUUID(), created: true };
}

function toInt(u: unknown, fallback = 0) {
  const n = Number(u as any);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

type EnsureInput = { productId: number; qty?: number };

async function ensureCartIdForSid(sid: string): Promise<string> {
  const found = await db.query.carts.findFirst({
    where: and(eq(carts.sid, sid), eq(carts.status, "open")),
  });
  if (found?.id) return found.id;

  const [row] = await db
    .insert(carts)
    .values({ sid, status: "open" })
    .returning({ id: carts.id });

  return row.id;
}

async function ensureLine(cartId: string, input: EnsureInput) {
  const productId = toInt(input.productId, 0);
  const qty = Math.max(1, toInt(input.qty, 1));
  if (!productId) return { ok: false as const, error: "Missing productId" };

  // NOTE: if you key by option chain, include equality on those columns here.
  const existing = await db.query.cartLines.findFirst({
    where: and(eq(cartLines.cartId, cartId), eq(cartLines.productId, productId)),
  });

  if (existing) {
    const newQty = Math.max(1, (existing.quantity ?? 1) + qty);
    const [updated] = await db
      .update(cartLines)
      .set({ quantity: newQty, updatedAt: sql`now()` })
      .where(eq(cartLines.id, existing.id))
      .returning({ id: cartLines.id, quantity: cartLines.quantity });

    return { ok: true as const, lineId: updated.id, quantity: updated.quantity };
  }

  const [inserted] = await db
    .insert(cartLines)
    .values({ cartId, productId, quantity: qty })
    .returning({ id: cartLines.id, quantity: cartLines.quantity });

  return { ok: true as const, lineId: inserted.id, quantity: inserted.quantity };
}

/* ---------- handlers ---------- */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const productId = toInt(url.searchParams.get("productId"));
    const qty = toInt(url.searchParams.get("qty"), 1);

    const { sid, created } = await readOrCreateSid();
    const cartId = await ensureCartIdForSid(sid);
    const result = await ensureLine(cartId, { productId, qty });

    const res = NextResponse.json(result, {
      status: result.ok ? 200 : 400,
      headers: { "Cache-Control": "no-store" },
    });
    if (created) attachSidCookie(res, sid);
    return res;
  } catch (err: any) {
    console.error("[lines/ensure GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error creating line" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<EnsureInput>;
    const productId = toInt(body.productId);
    const qty = toInt(body.qty, 1);

    const { sid, created } = await readOrCreateSid();
    const cartId = await ensureCartIdForSid(sid);
    const result = await ensureLine(cartId, { productId, qty });

    const res = NextResponse.json(result, {
      status: result.ok ? 200 : 400,
      headers: { "Cache-Control": "no-store" },
    });
    if (created) attachSidCookie(res, sid);
    return res;
  } catch (err: any) {
    console.error("[lines/ensure POST] error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error creating line" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
