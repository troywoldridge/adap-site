// src/lib/customer.ts
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { customers, loyaltyWallets } from "@/db/schema/customer";
import { eq } from "drizzle-orm";

export async function ensureCustomer() {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Not authenticated");

  const email = (sessionClaims?.email as string) || null;
  const display = (sessionClaims?.name as string) || null;

  const [cust] = await db
    .insert(customers)
    .values({ clerkUserId: userId, email: email ?? undefined, displayName: display ?? undefined })
    .onConflictDoUpdate({
      target: customers.clerkUserId,
      set: { email: email ?? undefined, displayName: display ?? undefined },
    })
    .returning();

  // Wallet
  await db
    .insert(loyaltyWallets)
    .values({ customerId: cust.id })
    .onConflictDoNothing();

  return cust;
}

export async function getCustomerByClerk(userId: string) {
  const rows = await db.select().from(customers).where(eq(customers.clerkUserId, userId)).limit(1);
  return rows[0] ?? null;
}
