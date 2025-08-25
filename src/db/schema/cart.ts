// db/schema/cart.ts
import { pgTable, text, jsonb, uuid, timestamp } from "drizzle-orm/pg-core";

export type SelectedShipping = {
  carrier: string;
  method: string;
  cost: number;
  days: number | null;
  currency: "USD" | "CAD";
  country: "US" | "CA";
  state: string;
  zip: string;
};

export const carts = pgTable("carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  sid: text("sid").notNull(),
  status: text("status").notNull().default("open"),
  userId: text("user_id"),
  currency: text("currency").notNull().default("USD"),
  selectedShipping: jsonb("selected_shipping").$type<SelectedShipping | null>().default(null),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ⛔️ DO NOT put cartsRelations here (it references cartLines and creates a cycle)
