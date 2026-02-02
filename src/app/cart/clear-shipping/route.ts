import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbClient as db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { and, eq, ne } from "drizzle-orm";

export async function POST() {
  const database = db;

  try {
    const sid = (await cookies()).get("sid")?.value ?? "";
    if (!sid) return NextResponse.json({ ok: false, error: "No session/cart." }, { status: 400 });

    const [cart] = await database
      .select()
      .from(carts)
      .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
      .limit(1);

    if (!cart) return NextResponse.json({ ok: false, error: "Cart not found." }, { status: 404 });

    await database.update(carts).set({ selectedShipping: null }).where(eq(carts.id, cart.id));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
