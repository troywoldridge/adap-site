import { pgTable, foreignKey, varchar, boolean, timestamp, uuid, index, text, numeric, char, integer, jsonb, uniqueIndex, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const cartStatus = pgEnum("cart_status", ['open', 'submitted', 'abandoned'])
export const currencyCode = pgEnum("currency_code", ['USD', 'CAD'])
export const loyaltyReason = pgEnum("loyalty_reason", ['purchase', 'refund', 'adjustment', 'signup', 'promotion'])
export const orderStatus = pgEnum("order_status", ['draft', 'submitted', 'paid', 'fulfilled', 'cancelled', 'refunded'])


export const reviewHelpfulVotes = pgTable("review_helpful_votes", {
	userId: varchar("user_id", { length: 64 }),
	ip: varchar({ length: 48 }),
	isHelpful: boolean("is_helpful").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	reviewId: uuid("review_id").notNull(),
	id: uuid().defaultRandom().primaryKey().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.reviewId],
			foreignColumns: [productReviews.id],
			name: "review_helpful_votes_review_id_fkey"
		}).onDelete("cascade"),
]);

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
	index("idx_orders_placed_at").using("btree", table.placedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_orders_provider_id").using("btree", table.provider.asc().nullsLast().op("text_ops"), table.providerId.asc().nullsLast().op("text_ops")),
]);

export const artworkUploads = pgTable("artwork_uploads", {
	productId: varchar("product_id", { length: 48 }).notNull(),
	orderId: varchar("order_id", { length: 48 }),
	userId: varchar("user_id", { length: 64 }),
	fileUrl: varchar("file_url", { length: 255 }).notNull(),
	fileName: varchar("file_name", { length: 128 }).notNull(),
	fileSize: integer("file_size"),
	fileType: varchar("file_type", { length: 64 }),
	approved: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	id: uuid().defaultRandom().primaryKey().notNull(),
});

export const orderSessions = pgTable("order_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: varchar("user_id", { length: 64 }),
	productId: varchar("product_id", { length: 64 }).notNull(),
	options: jsonb().default([]).notNull(),
	files: jsonb().default([]).notNull(),
	shippingInfo: jsonb("shipping_info"),
	billingInfo: jsonb("billing_info"),
	currency: varchar({ length: 8 }).default('USD').notNull(),
	subtotal: numeric().default('0').notNull(),
	tax: numeric().default('0').notNull(),
	discount: numeric().default('0').notNull(),
	total: numeric().default('0').notNull(),
	selectedShippingRate: jsonb("selected_shipping_rate"),
	stripeCheckoutSessionId: varchar("stripe_checkout_session_id", { length: 128 }),
	stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 128 }),
	sinaliteOrderId: varchar("sinalite_order_id", { length: 64 }),
	notes: varchar({ length: 1000 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	trackingUrl: varchar("tracking_url", { length: 255 }),
});

export const cartArtwork = pgTable("cart_artwork", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	side: integer().notNull(),
	url: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	cartLineId: uuid("cart_line_id").notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.cartLineId],
			foreignColumns: [cartLines.id],
			name: "cart_artwork_cart_line_id_cart_lines_id_fk"
		}).onDelete("cascade"),
]);

export const cartAttachments = pgTable("cart_attachments", {
	lineId: text("line_id").notNull(),
	productId: integer("product_id").notNull(),
	storageId: text("storage_id").notNull(),
	fileName: text("file_name").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	id: uuid().defaultRandom().primaryKey().notNull(),
});

export const loyaltyTransactions = pgTable("loyalty_transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	walletId: uuid("wallet_id").notNull(),
	delta: integer().notNull(),
	reason: loyaltyReason().notNull(),
	orderId: integer("order_id"),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_loyalty_wallet").using("btree", table.walletId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const orderItems = pgTable("order_items", {
	productId: integer("product_id").notNull(),
	quantity: integer().default(1).notNull(),
	optionChain: text("option_chain"),
	pricingHash: text("pricing_hash"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	orderId: uuid("order_id").notNull(),
	id: uuid().defaultRandom().primaryKey().notNull(),
}, (table) => [
	index("idx_order_items_order").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_items_order_id_fkey"
		}).onDelete("cascade"),
]);

export const productReviews = pgTable("product_reviews", {
	productId: varchar("product_id", { length: 48 }).notNull(),
	name: varchar({ length: 60 }).notNull(),
	email: varchar({ length: 80 }),
	rating: integer().notNull(),
	comment: text().notNull(),
	approved: boolean().default(false),
	userIp: varchar("user_ip", { length: 45 }),
	termsAgreed: boolean("terms_agreed").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	verified: boolean().default(false),
	id: uuid().defaultRandom().primaryKey().notNull(),
}, (table) => [
	index("idx_product_reviews_approved").using("btree", table.approved.asc().nullsLast().op("bool_ops")),
	index("idx_product_reviews_product").using("btree", table.productId.asc().nullsLast().op("text_ops")),
]);

export const cartLines = pgTable("cart_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	cartId: uuid("cart_id").notNull(),
	productId: integer("product_id").notNull(),
	optionIds: jsonb("option_ids").default([]).notNull(),
	quantity: integer().default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	artwork: jsonb().default({}).notNull(),
	unitPrice: numeric("unit_price", { precision: 12, scale:  2 }).default('0').notNull(),
	sinalitePackageInfo: jsonb("sinalite_package_info").default({}).notNull(),
	unitPriceCents: integer("unit_price_cents").default(0).notNull(),
	lineTotalCents: integer("line_total_cents").default(0).notNull(),
	pricedOptionIds: jsonb("priced_option_ids"),
	optionChain: text("option_chain"),
}, (table) => [
	index("idx_cart_lines_cart").using("btree", table.cartId.asc().nullsLast().op("uuid_ops")),
	index("idx_cart_lines_product").using("btree", table.productId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("uq_cart_product_chain").using("btree", table.cartId.asc().nullsLast().op("text_ops"), table.productId.asc().nullsLast().op("int4_ops"), table.optionChain.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.cartId],
			foreignColumns: [carts.id],
			name: "fk_cart_lines_cart"
		}).onDelete("cascade"),
]);

export const carts = pgTable("carts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sid: text().notNull(),
	userId: text("user_id"),
	status: text().default('open').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	selectedShipping: jsonb("selected_shipping"),
	currency: text().default('USD').notNull(),
}, (table) => [
	index("idx_carts_sid").using("btree", table.sid.asc().nullsLast().op("text_ops")),
	index("idx_carts_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_carts_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const customers = pgTable("customers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clerkUserId: text("clerk_user_id").notNull(),
	displayName: text("display_name"),
	email: text(),
	// TODO: failed to parse database type 'bytea'
	phoneEnc: unknown("phone_enc"),
	marketingOptIn: boolean("marketing_opt_in").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_customers_clerk").using("btree", table.clerkUserId.asc().nullsLast().op("text_ops")),
	index("idx_customers_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
]);

export const loyaltyWallets = pgTable("loyalty_wallets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	customerId: uuid("customer_id").notNull(),
	pointsBalance: integer("points_balance").default(0).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const customerAddresses = pgTable("customer_addresses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	customerId: uuid("customer_id").notNull(),
	label: text(),
	fullName: text("full_name"),
	company: text(),
	// TODO: failed to parse database type 'bytea'
	phoneEnc: unknown("phone_enc"),
	line1: text().notNull(),
	line2: text(),
	city: text().notNull(),
	region: text().notNull(),
	postal: text().notNull(),
	country: text().notNull(),
	isDefaultShipping: boolean("is_default_shipping").default(false).notNull(),
	isDefaultBilling: boolean("is_default_billing").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	clerkUserId: text("clerk_user_id").notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	phone: text(),
	street1: text().notNull(),
	street2: text(),
	state: text().notNull(),
	postalCode: text("postal_code").notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
}, (table) => [
	index("idx_addr_clerk").using("btree", table.clerkUserId.asc().nullsLast().op("text_ops")),
	index("idx_addr_customer").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("uniq_addr_default_by_clerk").using("btree", table.clerkUserId.asc().nullsLast().op("text_ops")).where(sql`(is_default IS TRUE)`),
	uniqueIndex("uq_addr_default_per_clerk").using("btree", table.clerkUserId.asc().nullsLast().op("text_ops")).where(sql`(is_default = true)`),
]);
