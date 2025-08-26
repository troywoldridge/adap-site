import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customer";

/**
 * Customer addresses (normalized v2)
 * Matches the SQL migration you applied:
 *  - clerk_user_id (NOT NULL)
 *  - first_name / last_name
 *  - phone (plaintext; keep phone_enc in other tables if you still use it)
 *  - street1 / street2
 *  - city / state / postal_code / country
 *  - is_default (NOT NULL DEFAULT false)
 *  - optional customer_id FK → customers.id
 */
export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Either clerk-based join…
    clerkUserId: text("clerk_user_id").notNull(),

    // …or optional FK to our customers table (keep it nullable)
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "cascade",
    }),

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

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    byClerk: index("idx_addr_clerk").on(t.clerkUserId),
    byCustomer: index("idx_addr_customer").on(t.customerId),
  })
);
