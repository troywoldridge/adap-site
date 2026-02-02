// app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { orderSessions } from "@/lib/db/schema";
import { enforceRateLimit } from "@/lib/rateLimit";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ParamsSchema = z.object({ id: z.string().uuid() });

async function requireUserId() {
  const { userId } = await auth(); // ✅ await!
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await enforceRateLimit(_req);
  if (limited) {
    return limited;
  }

  try {
    const userId = await requireUserId();
    const { id } = ParamsSchema.parse(params);

    const rows = await db
      .select()
      .from(orderSessions)
      .where(and(eq(orderSessions.id, id), eq(orderSessions.userId, userId)))
      .limit(1);

    if (!rows[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (err: any) {
    if (err?.issues) {
      return NextResponse.json({ error: "Invalid request", details: err.issues }, { status: 422 });
    }
    const msg = err?.message || "Order fetch failed";
    const status = /Unauthorized/.test(msg) ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export async function PUT() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export async function DELETE() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
