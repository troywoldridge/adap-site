import { ColumnBaseConfig, ColumnDataType } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  char,
  pgEnum,
  index,
  customType,
  varchar,
  ExtraConfigColumn,
  numeric,
} from "drizzle-orm/pg-core";


export const orders = pgTable("orders", {
	userId: text("user_id").notNull(),
	status: text().default('draft').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	total: numeric(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	customerId: uuid("customer_id"),
	orderNumber: text("order_number"),
	currency: char({ length: 3 }),
	subtotalCents: integer("subtotal_cents").default(0).notNull(),
	taxCents: integer("tax_cents").default(0).notNull(),
	shippingCents: integer("shipping_cents").default(0).notNull(),
	discountCents: integer("discount_cents").default(0).notNull(),
	totalCents: integer("total_cents").default(0).notNull(),
	placedAt: timestamp("placed_at", { withTimezone: true, mode: 'string' }),
	provider: text(),
	providerId: text("provider_id"),
	billingAddressId: uuid("billing_address_id"),
	shippingAddressId: uuid("shipping_address_id"),
	id: uuid().defaultRandom().primaryKey().notNull(),
}, (table) => [
	index("idx_orders_customer").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	index("idx_orders_provider_id").using("btree", table.provider.asc().nullsLast().op("text_ops"), table.providerId.asc().nullsLast().op("text_ops")),
]);