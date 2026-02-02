import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema/addresses"; // adjust path/name to yours

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    // Clear existing default
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    // Set this one as default (ownership implied by userId FK on your table)
    await db.update(addresses).set({ isDefault: true }).where(eq(addresses.id, params.id));

    // Optionally return updated list for UI refresh
    const rows = await db.select().from(addresses).where(eq(addresses.userId, userId));
    return NextResponse.json({ ok: true, addresses: rows });
  } catch (e: any) {
    console.error("set default address failed", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
