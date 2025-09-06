import {
  pgTable, uuid, text, varchar, char, boolean, timestamp,
  index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),

    // Clerk user id, e.g. "user_abc123" — TEXT (not UUID!)
    userId: text("user_id").notNull(),

    name: varchar("name", { length: 120 }).notNull(),       // e.g. "Home", "Office", or Full Name
    line1: varchar("line1", { length: 200 }).notNull(),
    line2: varchar("line2", { length: 200 }),
    city: varchar("city", { length: 120 }).notNull(),
    state: varchar("state", { length: 120 }).notNull(),
    postalCode: varchar("postal_code", { length: 32 }).notNull(),
    country: char("country", { length: 2 }).notNull(),      // 'US' | 'CA'
    phone: varchar("phone", { length: 40 }),

    isDefault: boolean("is_default").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_addresses_user").on(t.userId),
    // Enforce one default address per user (at most)
    uniqueIndex("uniq_addresses_default_per_user")
      .on(t.userId)
      .where(t.isDefault.eq(true)),
  ],
);

export type AddressRow = InferSelectModel<typeof addresses>;
export type AddressInsert = InferInsertModel<typeof addresses>;
