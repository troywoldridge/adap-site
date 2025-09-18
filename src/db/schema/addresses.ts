// src/db/schema/addresses.ts
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const addresses = pgTable(
  "addresses",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    // Clerk user id or a guest session id — adjust your app logic accordingly
    userId: text("user_id").notNull(),

    name: text("name"),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postalCode: text("postal_code").notNull(),
    country: text("country").notNull(), // 'US' | 'CA'
    phone: text("phone"),

    isDefault: boolean("is_default").notNull().default(false),

    // NOTE: using mode:"string" => TypeScript type is string. Prefer mode:"date" if you want Date.
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (t) => [
    index("addresses_user_id_idx").on(t.userId),

    // Ensure at most one default per user
    uniqueIndex("addresses_user_default_uq").on(t.userId).where(sql`is_default = true`),
  ],
);

/** Row type returned from SELECTs */
export type AddressRow = InferSelectModel<typeof addresses>;

/** Values type for INSERTs */
export type AddressInsert = InferInsertModel<typeof addresses>;
