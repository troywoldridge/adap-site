import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { carts, type SelectedShipping } from "@/db/schema/cart";
import { getOrSetSid } from "@/lib/sid";

export async function POST(req: NextRequest) {
  try {
    const sid = await getOrSetSid();

    const body = (await req.json()) as Partial<SelectedShipping> | null;
    if (!body) {
      return NextResponse.json({ ok: false, error: "Missing body" }, { status: 400 });
    }

    const {
      carrier = "",
      method = "",
      cost,
      days = null,
      currency,
      country,
      state = "",
      zip = "",
    } = body;

    const cur = (currency === "CAD" ? "CAD" : currency === "USD" ? "USD" : null) as
      | "USD"
      | "CAD"
      | null;
    const ctry = (country === "CA" ? "CA" : country === "US" ? "US" : null) as "US" | "CA" | null;

    if (!carrier || !method || !(typeof cost === "number") || !cur || !ctry || !state || !zip) {
      return NextResponse.json(
        { ok: false, error: "carrier, method, cost, currency, country, state, zip are required" },
        { status: 400 }
      );
    }

    // find open cart by sid (create if missing)
    let cart = await db.query.carts.findFirst({
      where: and(eq(carts.sid, sid), eq(carts.status, "open")),
    });
    if (!cart) {
      const [row] = await db.insert(carts).values({ sid }).returning();
      cart = row;
    }

    const selected: SelectedShipping = {
      carrier,
      method,
      cost,
      days: typeof days === "number" ? days : null,
      currency: cur,
      country: ctry,
      state: state.toUpperCase(),
      zip,
    };

    await db
      .update(carts)
      .set({ selectedShipping: selected, updatedAt: new Date() })
      .where(eq(carts.id, cart.id));

    return NextResponse.json({ ok: true, shipping: selected });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
