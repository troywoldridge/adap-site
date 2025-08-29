// db/schema/cart.ts
import { pgTable, text, jsonb, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type SelectedShipping = {
  carrier: string;
  method: string;
  cost: number;                 // total shipping cost (decimal dollars in UI; store cents in totals if you prefer)
  days: number | null;          // business days
  currency: "USD" | "CAD";
  country: "US" | "CA";         // destination
  state: string;
  zip: string;
};

export const carts = pgTable(
  "carts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sid: text("sid").notNull(),
    status: text("status").notNull().default("open"), // open | pending | closed | etc.
    userId: text("user_id"),

    // Cart-wide currency (US storeCode=9 => USD, CA storeCode=6 => CAD per Sinalite docs)
    currency: text("currency").notNull().default("USD"),

    // Persist the user’s chosen shipping option from POST /order/shippingEstimate
    selectedShipping: jsonb("selected_shipping")
      .$type<SelectedShipping | null>()
      .default(null),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_carts_sid").on(t.sid),
    index("idx_carts_status").on(t.status),
    index("idx_carts_user").on(t.userId),
  ]
);

// If you split relations, you can define them in a separate relations file.
// No changes needed here for Cloudflare images (that’s handled at render time via imagedelivery.net).

// ⛔️ DO NOT put cartsRelations here (it references cartLines and creates a cycle)
