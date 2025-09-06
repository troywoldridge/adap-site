import { db } from "@/lib/db";
import { addresses, type AddressRow, type AddressInsert } from "@/db/schema/addresses";
import { and, eq, desc } from "drizzle-orm";

export async function listAddresses(userId: string): Promise<AddressRow[]> {
  return db.select().from(addresses).where(eq(addresses.userId, userId)).orderBy(desc(addresses.isDefault));
}

export async function getDefaultAddress(userId: string): Promise<AddressRow | null> {
  const rows = await db.select().from(addresses)
    .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createAddress(userId: string, input: Omit<AddressInsert, "id"|"userId"|"createdAt"|"updatedAt">) {
  // If caller marks isDefault, unset others first
  if (input.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
  }
  const [row] = await db.insert(addresses).values({ ...input, userId }).returning();
  return row;
}

export async function updateAddress(userId: string, id: string, patch: Partial<AddressInsert>) {
  if (patch.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
  }
  const [row] = await db.update(addresses).set({ ...patch, updatedAt: new Date() }).where(and(eq(addresses.id, id), eq(addresses.userId, userId))).returning();
  return row;
}

export async function deleteAddress(userId: string, id: string) {
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
}

export async function setDefaultAddress(userId: string, id: string) {
  await db.transaction(async (tx) => {
    await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    await tx.update(addresses).set({ isDefault: true }).where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  });
}
