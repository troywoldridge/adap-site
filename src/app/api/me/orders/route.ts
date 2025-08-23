// src/app/api/me/orders/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { carts, orders } from "@/db/schema";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }

  // pagination
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") || 20)));
  const offset = (page - 1) * pageSize;

  // ── Try to pull primary email from Clerk ─────────────────────────────
  let primaryEmail: string | null = null;
  try {
    const cc = await clerkClient(); // in your setup, clerkClient is a function
    const user = await cc.users.getUser(userId);
    primaryEmail =
      user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress ??
      null;
  } catch {
    /* non-fatal */
  }

  // ── Claim guest orders by email (best-effort; column may differ) ─────
  if (primaryEmail) {
    try {
      await db
        .update(orders)
        .set({ userId })
        .where(
          and(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            isNull((orders as any).userId),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            eq((orders as any).customerEmail, primaryEmail)
          )
        );
    } catch {
      // ignore if your schema doesn't have customerEmail
    }
  }

  // ── Claim guest orders by cartId -> sid (from cookie) ────────────────
  const jar = await cookies();
  const sid =
    jar.get("adap_sid")?.value ??
    jar.get("sid")?.value ??
    null;

  if (sid) {
    try {
      // find carts for this sid
      const cartRows = await db
        .select({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          id: (carts as any).id,
        })
        .from(carts)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .where(eq((carts as any).sid, sid));

      const cartIds = cartRows.map((r) => String(r.id));
      if (cartIds.length) {
        // attach orders with those cartIds to this user (where not already claimed)
        await db
          .update(orders)
          .set({ userId })
          .where(
            and(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isNull((orders as any).userId),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              inArray((orders as any).cartId, cartIds)
            )
          );
      }
    } catch {
      // ignore if your schema uses a different column name than cartId
    }
  }

  // ── Return this user's orders ────────────────────────────────────────
  const rows = await db
    .select()
    .from(orders)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .where(eq((orders as any).userId, userId))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .orderBy(desc((orders as any).createdAt))
    .limit(pageSize)
    .offset(offset);

  return NextResponse.json({ ok: true, page, pageSize, orders: rows });
}
