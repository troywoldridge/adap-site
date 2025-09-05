// src/app/api/me/orders/route.ts
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { carts, orders } from "@/db/schema";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

function toInt(v: unknown, d = 1, max = 50) {
  const n = Number(v as any);
  if (!Number.isFinite(n) || n <= 0) return d;
  return Math.min(Math.floor(n), max);
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }

  // pagination
  const url = new URL(req.url);
  const page = toInt(url.searchParams.get("page") ?? 1, 1, 9999);
  const pageSize = toInt(url.searchParams.get("pageSize") ?? 20, 20, 50);
  const offset = (page - 1) * pageSize;

  // best-effort Clerk email for guest→user claim
  let primaryEmail: string | null = null;
  try {
    const me = await currentUser();
    primaryEmail =
      me?.primaryEmailAddress?.emailAddress ??
      me?.emailAddresses?.[0]?.emailAddress ??
      null;
  } catch {
    /* ignore */
  }

  // Column guards (reference only what exists on your schema)
  const o: any = orders as any;
  const hasUserId = o?.userId !== undefined;
  const hasCustomerEmail = o?.customerEmail !== undefined;
  const hasCartId = o?.cartId !== undefined;
  const hasCreatedAt = o?.createdAt !== undefined;
  const hasPlacedAt = o?.placedAt !== undefined;

  // 1) claim by email
  if (primaryEmail && hasUserId && hasCustomerEmail) {
    try {
      await db.update(o).set({ userId }).where(and(isNull(o.userId), eq(o.customerEmail, primaryEmail)));
    } catch {}
  }

  // 2) claim by cartId via sid cookie
  const jar = await cookies();
  const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? null;
  if (sid && hasUserId && hasCartId) {
    try {
      const cartRows = await db
        .select({ id: (carts as any).id })
        .from(carts as any)
        .where(eq((carts as any).sid, sid));
      const cartIds = cartRows.map((r) => String(r.id));
      if (cartIds.length > 0) {
        await db.update(o).set({ userId }).where(and(isNull(o.userId), inArray(o.cartId, cartIds)));
      }
    } catch {}
  }

  // 3) where
  let whereExpr: any;
  if (hasUserId) whereExpr = eq(o.userId, userId);
  else if (hasCustomerEmail && primaryEmail) whereExpr = eq(o.customerEmail, primaryEmail);
  else {
    return NextResponse.json({ ok: true, page, pageSize, total: 0, orders: [] });
  }

  // count
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(o).where(whereExpr);

  // build query WITHOUT ever passing undefined to orderBy
  let q: any = db.select().from(o).where(whereExpr);
  if (hasCreatedAt) q = q.orderBy(desc(o.createdAt));
  else if (hasPlacedAt) q = q.orderBy(desc(o.placedAt));
  q = q.limit(pageSize).offset(offset);

  const rows = await q;

  return NextResponse.json({
    ok: true,
    page,
    pageSize,
    total: Number(count) || 0,
    orders: rows,
  });
}
