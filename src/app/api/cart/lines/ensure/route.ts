import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

// ---------- utils ----------
function toInt(u: unknown, fallback = 0) {
  const n = Number(u as any);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

type EnsureInput = { productId: number; qty?: number };

async function ensureCartIdForSid(sid: string): Promise<string> {
  // find open cart
  const found = await db.query.carts.findFirst({
    where: and(eq(carts.sid, sid), eq(carts.status, "open")),
  });
  if (found?.id) return found.id;

  // create new cart
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

  // If you key lines by option chain/hash, include those columns in the where
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

async function readOrCreateSid(): Promise<{ sid: string; created: boolean }> {
  const jar = (await (typeof (cookies() as any)?.then === "function"
    ? (cookies() as any)
    : cookies())) as any;

  const existing = jar.get?.("adap_sid")?.value ?? jar.get?.("sid")?.value;
  if (existing) return { sid: existing, created: false };

  return { sid: crypto.randomUUID(), created: true };
}

function attachSidCookie(res: NextResponse, sid: string) {
  // set both keys for compatibility
  res.cookies.set("adap_sid", sid, { httpOnly: true, sameSite: "lax", path: "/" });
  res.cookies.set("sid", sid, { httpOnly: true, sameSite: "lax", path: "/" });
}

// ---------- handlers ----------
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const productId = toInt(url.searchParams.get("productId"));
    const qty = toInt(url.searchParams.get("qty"), 1);

    const { sid, created } = await readOrCreateSid();
    const cartId = await ensureCartIdForSid(sid);
    const result = await ensureLine(cartId, { productId, qty });

    const res = NextResponse.json(result, { status: result.ok ? 200 : 400 });
    if (created) attachSidCookie(res, sid);
    return res;
  } catch (err: any) {
    console.error("[ensure GET] error:", err);
    return NextResponse.json({ ok: false, error: "Server error creating line" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<EnsureInput>;
    const productId = toInt(body.productId);
    const qty = toInt(body.qty, 1);

    const { sid, created } = await readOrCreateSid();
    const cartId = await ensureCartIdForSid(sid);
    const result = await ensureLine(cartId, { productId, qty });

    const res = NextResponse.json(result, { status: result.ok ? 200 : 400 });
    if (created) attachSidCookie(res, sid);
    return res;
  } catch (err: any) {
    console.error("[ensure POST] error:", err);
    return NextResponse.json({ ok: false, error: "Server error creating line" }, { status: 500 });
  }
}
