// src/lib/addresses.ts (or wherever this module lives)
import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { addresses, type AddressRow, type AddressInsert } from "@/db/schema/addresses";

/**
 * List addresses for a user. Default addresses come first.
 */
export async function listAddresses(userId: string): Promise<AddressRow[]> {
  return db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault));
}

/**
 * Get a user's default address (if any).
 */
export async function getDefaultAddress(userId: string): Promise<AddressRow | null> {
  const rows = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Create an address for a user.
 * If `input.isDefault` is true, unset all other defaults first.
 */
export async function createAddress(
  userId: string,
  input: Omit<AddressInsert, "id" | "userId" | "createdAt" | "updatedAt">,
): Promise<AddressRow> {
  if (input.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
  }

  const [row] = await db
    .insert(addresses)
    .values({ ...input, userId })
    .returning();

  return row;
}

/**
 * Update an address. Only touches the current user's address.
 * If `patch.isDefault` is true, unset other defaults first.
 *
 * Note: updatedAt column is mode:"string" in schema, so use sql`now()` not Date.
 */
export async function updateAddress(
  userId: string,
  id: string,
  patch: Partial<Omit<AddressInsert, "id" | "userId" | "createdAt" | "updatedAt">> & {
    isDefault?: boolean;
  },
): Promise<AddressRow | null> {
  if (patch.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
  }

  const [row] = await db
    .update(addresses)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .returning();

  return row ?? null;
}

/**
 * Delete an address belonging to a user.
 */
export async function deleteAddress(userId: string, id: string): Promise<void> {
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
}

/**
 * Atomically set an address as default for a user.
 */
export async function setDefaultAddress(userId: string, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    await tx
      .update(addresses)
      .set({ isDefault: true, updatedAt: sql`now()` })
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  });
}
