import "server-only";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { dbClient as db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { getOrSetSid } from "@/lib/sid";

export type CartRow = typeof carts.$inferSelect;

const CART_COOKIE = "sid";

/** Read cart for the current session cookie (sid). */
export async function getCartForSession(): Promise<CartRow | null> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  if (!raw) return null;

  const database = db;
  const rows = await database
    .select()
    .from(carts)
    .where(eq(carts.sid, String(raw)));

  return rows[0] ?? null;
}

/** Ensure a cart exists for the current session (create if missing). */
export async function getOrCreateCartForSession(): Promise<CartRow> {
  const jar = await cookies();
  let raw = jar.get(CART_COOKIE)?.value;

  if (!raw) {
    raw = await getOrSetSid();
  }

  const sid = String(raw);
  const database = db;

  const found = await database
    .select()
    .from(carts)
    .where(eq(carts.sid, sid));

  if (found[0]) return found[0];

  const [inserted] = await database
    .insert(carts)
    .values({ sid, status: "open" })
    .returning();

  return inserted;
}
