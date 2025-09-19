// src/lib/customer.ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { customers } from "@/db/schema/customer"; // <- matches your path
import { eq } from "drizzle-orm";

/**
 * Ensure there's a customers row for the current Clerk user.
 * - Requires a non-null email per your table.
 * - Upserts by unique clerkUserId.
 */
export async function ensureCustomer() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const user = await currentUser();

  // email is required by your schema (NOT NULL)
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;
  if (!email) {
    throw new Error("Authenticated user has no email address");
  }

  // Build a friendly display name:
  const fallbackName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const display =
    (user?.fullName ?? user?.username) ??
    (fallbackName ? fallbackName : undefined);

  // Build insert payload (avoid undefined props unless allowed)
  const toInsert = {
    clerkUserId: userId,
    email, // NOT NULL in your schema
    ...(display ? { displayName: display } : {}),
    // phoneEnc / marketingOptIn can be set later via profile flows
  };

  const [cust] = await db
    .insert(customers)
    .values(toInsert)
    .onConflictDoUpdate({
      target: customers.clerkUserId,
      set: {
        email, // keep email current with Clerk
        ...(display ? { displayName: display } : {}),
        updatedAt: new Date(),
      },
    })
    .returning();

  return cust;
}

export async function getCustomerByClerk(userId: string) {
  const rows = await db
    .select()
    .from(customers)
    .where(eq(customers.clerkUserId, userId))
    .limit(1);
  return rows[0] ?? null;
}
