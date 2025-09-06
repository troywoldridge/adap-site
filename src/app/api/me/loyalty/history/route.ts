import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { loyaltyTransactions } from "@/db/schema/loyalty"; // make sure this matches your file
// Expected columns: id, customerId(text), type('earn'|'redeem'|'adjust'), pointsDelta(int), orderId(text|null), note(text|null), createdAt

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const rows = await db
      .select({
        id: loyaltyTransactions.id,
        type: loyaltyTransactions.type,
        pointsDelta: loyaltyTransactions.pointsDelta, // if your column is points_delta, mapWith in schema
        orderId: loyaltyTransactions.orderId,
        note: loyaltyTransactions.note,
        createdAt: loyaltyTransactions.createdAt,
      })
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.customerId, userId))
      .orderBy(desc(loyaltyTransactions.createdAt))
      .limit(200);

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    console.error("/api/me/loyalty/history failed", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
