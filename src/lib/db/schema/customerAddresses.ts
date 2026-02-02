// src/db/schema/customerAddresses.ts
import {
  pgTable, uuid, text, boolean, timestamp, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";              // ✅ add this
import { customers } from "./customer";

export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "cascade" }),

    label: text("label"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    company: text("company"),
    phone: text("phone"),

    street1: text("street1").notNull(),
    street2: text("street2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postalCode: text("postal_code").notNull(),
    country: text("country").notNull(),

    isDefault: boolean("is_default").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byClerk: index("idx_addr_clerk").on(t.clerkUserId),
    byCustomer: index("idx_addr_customer").on(t.customerId),
    // ✅ use eq(...) instead of t.isDefault.eq(true)
    uniqDefaultPerUser: uniqueIndex("uniq_addr_default_by_clerk")
      .on(t.clerkUserId)
      .where(eq(t.isDefault, true)),
  })
);
