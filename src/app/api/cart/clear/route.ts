// src/app/api/cart/clear/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbClient as db } from "@/lib/db";
import { carts } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const jar = await cookies();
    const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? null;

    // Clear client cache cookie (this one is non-httpOnly)
    jar.set("ADAP_CART_V1", JSON.stringify({ updatedAt: Date.now(), lines: [] }), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      secure: false,
      maxAge: 60 * 60 * 24 * 7,
    });

    if (sid) {
      // Mark any open cart as submitted (if not already)
      const [cart] = await db
        .select()
        .from(carts)
        .where(and(eq(carts.sid as any, sid), eq(carts.status as any, "open")))
        .limit(1);

      if (cart) {
        await db
          .update(carts)
          .set({ status: "submitted" as any })
          .where(eq(carts.id, cart.id));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
