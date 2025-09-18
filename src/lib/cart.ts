// src/lib/cart.ts
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { carts } from "@/lib/db/schema/cart";
import { eq } from "drizzle-orm";
import { getOrSetSid } from "@/lib/sid";

export type CartRow = typeof carts.$inferSelect;

const CART_COOKIE = "sid";

export async function getCartForSession(): Promise<CartRow | null> {
  const jar = cookies();                       // no await
  const raw = jar.get(CART_COOKIE)?.value;     // string | undefined
  if (!raw) {
    return null;
  }
  const sid = String(raw);                     // narrow to string

  const rows = await db.select().from(carts).where(eq(carts.sid, sid));
  return rows[0] ?? null;
}

export async function getOrCreateCartForSession(): Promise<CartRow> {
  const jar = cookies();                       // no await
  let raw = jar.get(CART_COOKIE)?.value as string | undefined;

  if (!raw) {
    raw = await getOrSetSid();              // must return string
  }
  const sid = String(raw);                     // narrow to string

  // Try get
  const found = await db.select().from(carts).where(eq(carts.sid, sid));
  if (found[0]) {
    return found[0];
  }

  // Create
  const inserted = await db
    .insert(carts)
    .values({ sid, status: "open" })           // sid is now definitely string
    .returning();

  return inserted[0];
}
