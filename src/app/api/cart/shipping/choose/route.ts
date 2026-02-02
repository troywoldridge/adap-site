// src/app/api/cart/shipping/choose/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, ne } from "drizzle-orm";
import { dbClient as db } from "@/lib/db";
import { carts } from "@/db/schema/cart";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      country?: "US" | "CA";
      state?: string;
      zip?: string;
      carrier?: string;
      method?: string;
      cost?: number;
      days?: number | null;
      currency?: "USD" | "CAD";
    };

    const sid = (await cookies()).get("sid")?.value ?? (await cookies()).get("adap_sid")?.value ?? "";
    if (!sid) return NextResponse.json({ ok: false, error: "No session" }, { status: 400 });

    const [cart] =
      (await db
        .select({ id: carts.id })
        .from(carts)
        .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
        .limit(1)) ?? [];

    if (!cart) return NextResponse.json({ ok: false, error: "Cart not found" }, { status: 404 });

    const payload = {
      carrier: String(body.carrier || ""),
      method: String(body.method || ""),
      cost: Number(body.cost || 0),
      days: body.days == null ? null : Number(body.days),
      currency: body.currency === "CAD" ? "CAD" : "USD",
      country: body.country === "CA" ? "CA" : "US",
      state: String(body.state || ""),
      zip: String(body.zip || ""),
    };

    await db.update(carts).set({ selectedShipping: payload as any }).where(eq(carts.id, cart.id));

    return NextResponse.json({ ok: true, selected: payload });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
