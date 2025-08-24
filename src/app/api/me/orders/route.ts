// src/app/api/me/orders/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
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

  // Get user & primary email from Clerk without clerkClient()
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

  // Claim guest orders by email (best-effort; uses "as any" to tolerate schema variance)
  if (primaryEmail) {
    try {
      await db
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(orders as any)
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
      /* ok if your orders table doesn't have customerEmail */
    }
  }

  // Also claim by cartId via sid cookie (guest → user)
  const jar = await cookies();
  const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? null;

  if (sid) {
    try {
      const cartRows = await db
        .select({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          id: (carts as any).id,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(carts as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .where(eq((carts as any).sid, sid));

      const cartIds = cartRows.map((r) => String(r.id));
      if (cartIds.length) {
        await db
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update(orders as any)
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
      /* ok if your orders table uses a different foreign key than cartId */
    }
  }

  // Return this user's orders
  const rows = await db
    .select()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from(orders as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .where(eq((orders as any).userId, userId))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .orderBy(desc((orders as any).createdAt))
    .limit(pageSize)
    .offset(offset);

  return NextResponse.json({ ok: true, page, pageSize, orders: rows });
}
