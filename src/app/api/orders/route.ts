// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orderSessions } from "@/db/schema";
import { enforceRateLimit } from "@/lib/rateLimit";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

async function requireUserId() {
  const { userId } = await auth(); // ✅ await
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function GET(req: NextRequest) {
  const limited = await enforceRateLimit(req);
  if (limited) {
    return limited;
  }

  try {
    const userId = await requireUserId();

    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.issues },
        { status: 422 }
      );
    }
    const { page, pageSize } = parsed.data;

    const [rows, [{ count }]] = await Promise.all([
      db
        .select()
        .from(orderSessions)
        .where(eq(orderSessions.userId, userId))
        .orderBy(desc(orderSessions.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({ count: sql<number>`count(*)` })
        .from(orderSessions)
        .where(eq(orderSessions.userId, userId)),
    ]);

    return NextResponse.json({ page, pageSize, total: Number(count), data: rows });
  } catch (err: any) {
    const msg = err?.message || "Orders fetch failed";
    const status = /Unauthorized/.test(msg) ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
