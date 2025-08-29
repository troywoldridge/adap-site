// src/lib/addresses.ts
import "server-only";

import { db } from "@/lib/db";
import { customerAddresses } from "@/db/schema/customerAddresses";
import { and, eq } from "drizzle-orm";

/** Get the user's default address (great for pre-filling shipping). */
export async function getDefaultAddress(clerkUserId: string) {
  const rows = await db
    .select()
    .from(customerAddresses)
    .where(
      and(
        eq(customerAddresses.clerkUserId, clerkUserId),
        eq(customerAddresses.isDefault, true)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}
