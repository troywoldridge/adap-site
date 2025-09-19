// src/lib/cart.ts
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart"; // <- ensure this path matches your schema location
import { eq } from "drizzle-orm";
import { getOrSetSid } from "@/lib/sid";

export type CartRow = typeof carts.$inferSelect;

const CART_COOKIE = "sid";

/** Read cart for the current session cookie (sid). */
export async function getCartForSession(): Promise<CartRow | null> {
  const jar = await cookies();                            // await: cookies() is async now
  const raw = jar.get(CART_COOKIE)?.value;                // string | undefined
  if (!raw) return null;

  const sid = String(raw);
  const rows = await db.select().from(carts).where(eq(carts.sid, sid));
  return rows[0] ?? null;
}

/** Ensure a cart exists for the current session (create if missing). */
export async function getOrCreateCartForSession(): Promise<CartRow> {
  const jar = await cookies();                            // await here too
  let raw = jar.get(CART_COOKIE)?.value as string | undefined;

  if (!raw) {
    // getOrSetSid should set the cookie server-side and return a string sid
    raw = await getOrSetSid();
  }
  const sid = String(raw);

  // Try fetch
  const found = await db.select().from(carts).where(eq(carts.sid, sid));
  if (found[0]) return found[0];

  // Create
  const inserted = await db
    .insert(carts)
    .values({ sid, status: "open" })
    .returning();

  return inserted[0];
}
