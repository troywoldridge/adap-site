import { db } from "@/lib/db";
import { cartCredits } from "@/db/schema/cartCredits";
import { eq } from "drizzle-orm";

/** Sum of all credits (cents) currently applied to a cart */
export async function getCartCreditsCents(cartId: string): Promise<number> {
  const rows = await db
    .select({ amountCents: cartCredits.amountCents })
    .from(cartCredits)
    .where(eq(cartCredits.cartId, cartId));
  return rows.reduce((sum, r) => sum + (r.amountCents ?? 0), 0);
}

/** Format cents to currency string */
export function fmtCurrencyCents(cents: number, currency: "USD" | "CAD" = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents || 0) / 100);
}
