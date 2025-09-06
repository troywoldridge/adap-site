// src/app/api/cart/credits/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, ne, sum } from "drizzle-orm";

import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartCredits } from "@/db/schema/cartCredits";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadOpenCartBySid() {
  const jar = await cookies();
  const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? "";
  if (!sid) return null;
  const [cart] =
    (await db
      .select()
      .from(carts)
      .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
      .limit(1)) ?? [];
  return cart ?? null;
}

export async function GET() {
  const cart = await loadOpenCartBySid();
  if (!cart) return NextResponse.json({ ok: true, amountCents: 0, rows: [] });

  const rows = await db.select().from(cartCredits).where(eq(cartCredits.cartId, cart.id));
  const [{ value: totalCents } = { value: 0 }] =
    (await db
      .select({ value: sum(cartCredits.amountCents).mapWith(Number) })
      .from(cartCredits)
      .where(eq(cartCredits.cartId, cart.id))) ?? [];

  return NextResponse.json({ ok: true, amountCents: totalCents ?? 0, rows });
}

export async function DELETE() {
  const cart = await loadOpenCartBySid();
  if (!cart) return NextResponse.json({ ok: true });
  await db.delete(cartCredits).where(eq(cartCredits.cartId, cart.id));
  return NextResponse.json({ ok: true });
}
