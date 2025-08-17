import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cartLines } from "@/db/schema/cart";

export async function PATCH(req: Request) {
  try {
    const { lineId, side, url } = await req.json();
    const s = String(side);

    // fetch current artwork
    const line = await db.query.cartLines.findFirst({ where: eq(cartLines.id, lineId) });
    if (!line) {
      return NextResponse.json({ error: "Line not found" }, { status: 404 });
    }

    const current = (line.artwork ?? {}) as Record<string, string>;
    const next = { ...current };

    if (url) {
      next[s] = String(url);
    } else {
      delete next[s];
    }

    const [updated] = await db
      .update(cartLines)
      .set({ artwork: next, updatedAt: new Date().toISOString() })
      .where(eq(cartLines.id, lineId))
      .returning();

    return NextResponse.json({ ok: true, artwork: updated.artwork });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to save artwork" }, { status: 500 });
  }
}
