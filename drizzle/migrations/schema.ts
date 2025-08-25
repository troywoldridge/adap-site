import { pgTable, serial, varchar, integer, text, boolean, timestamp, index, foreignKey, unique, check, bigint, smallint, jsonb, numeric, uuid, char, uniqueIndex, bigserial, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const cartStatus = pgEnum("cart_status", ['open', 'submitted', 'abandoned'])
export const loyaltyReason = pgEnum("loyalty_reason", ['purchase', 'refund', 'adjustment', 'signup', 'promotion'])
export const orderStatus = pgEnum("order_status", ['draft', 'submitted', 'paid', 'fulfilled', 'cancelled', 'refunded'])


export const productReviews = pgTable("product_reviews", {
	id: serial().primaryKey().notNull(),
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
});

export const priceCache = pgTable("price_cache", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	productId: bigint("product_id", { mode: "number" }).notNull(),
	storeCode: smallint("store_code").notNull(),
	options: jsonb().notNull(),
	response: jsonb().notNull(),
	price: numeric({ precision: 12, scale:  2 }),
	cachedAt: timestamp("cached_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_price_recent").using("btree", table.productId.asc().nullsLast().op("int2_ops"), table.storeCode.asc().nullsLast().op("timestamptz_ops"), table.cachedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "price_cache_product_id_fkey"
		}).onDelete("cascade"),
	unique("price_cache_product_id_store_code_options_key").on(table.productId, table.storeCode, table.options),
	check("price_cache_store_code_check", sql`store_code = ANY (ARRAY[6, 9])`),
]);

export const orders = pgTable("orders", {
	id: serial().primaryKey().notNull(),
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
}, (table) => [
	index("idx_orders_customer").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	index("idx_orders_provider_id").using("btree", table.provider.asc().nullsLast().op("text_ops"), table.providerId.asc().nullsLast().op("text_ops")),
	index("idx_orders_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "orders_customer_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.billingAddressId],
			foreignColumns: [customerAddresses.id],
			name: "orders_billing_address_id_fkey"
		}),
	foreignKey({
			columns: [table.shippingAddressId],
			foreignColumns: [customerAddresses.id],
			name: "orders_shipping_address_id_fkey"
		}),
	unique("orders_order_number_key").on(table.orderNumber),
]);

export const artworkUploads = pgTable("artwork_uploads", {
	id: serial().primaryKey().notNull(),
	productId: varchar("product_id", { length: 48 }).notNull(),
	orderId: varchar("order_id", { length: 48 }),
	userId: varchar("user_id", { length: 64 }),
	fileUrl: varchar("file_url", { length: 255 }).notNull(),
	fileName: varchar("file_name", { length: 128 }).notNull(),
	fileSize: integer("file_size"),
	fileType: varchar("file_type", { length: 64 }),
	approved: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const cartAttachments = pgTable("cart_attachments", {
	id: serial().primaryKey().notNull(),
	lineId: text("line_id").notNull(),
	productId: integer("product_id").notNull(),
	storageId: text("storage_id").notNull(),
	fileName: text("file_name").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_cart_attachments_line").using("btree", table.lineId.asc().nullsLast().op("text_ops")),
	uniqueIndex("ux_cart_attachments_line_storage").using("btree", table.lineId.asc().nullsLast().op("text_ops"), table.storageId.asc().nullsLast().op("text_ops")),
]);

export const reviewHelpfulVotes = pgTable("review_helpful_votes", {
	id: serial().primaryKey().notNull(),
	reviewId: integer("review_id").notNull(),
	userId: varchar("user_id", { length: 64 }),
	ip: varchar({ length: 48 }),
	isHelpful: boolean("is_helpful").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
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
	index("idx_cart_artwork_line").using("btree", table.cartLineId.asc().nullsLast().op("uuid_ops")),
	index("idx_cart_artwork_line_side").using("btree", table.cartLineId.asc().nullsLast().op("int4_ops"), table.side.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.cartLineId],
			foreignColumns: [cartLines.id],
			name: "cart_artwork_cart_line_id_cart_lines_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.cartLineId],
			foreignColumns: [cartLines.id],
			name: "cart_artwork_cart_line_id_fkey"
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
	index("carts_sid_open_idx").using("btree", table.sid.asc().nullsLast().op("text_ops")).where(sql`(status = 'open'::text)`),
	index("idx_carts_open_sid").using("btree", table.sid.asc().nullsLast().op("text_ops")).where(sql`(status = 'open'::text)`),
	index("idx_carts_sid").using("btree", table.sid.asc().nullsLast().op("text_ops")),
	index("idx_carts_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_carts_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
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
	optionsByGroup: jsonb("options_by_group").default({}).notNull(),
	sinalitePackageInfo: jsonb("sinalite_package_info").default({}).notNull(),
	unitPriceCents: integer("unit_price_cents"),
	lineTotalCents: integer("line_total_cents"),
	pricedOptionIds: jsonb("priced_option_ids"),
	currency: text(),
	pricingMeta: jsonb("pricing_meta"),
}, (table) => [
	index("cart_lines_cart_created_idx").using("btree", table.cartId.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("idx_cart_lines_cart").using("btree", table.cartId.asc().nullsLast().op("uuid_ops")),
	index("idx_cart_lines_cartid_createdat_desc").using("btree", table.cartId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_cart_lines_product").using("btree", table.productId.asc().nullsLast().op("int4_ops")),
	index("idx_cart_lines_unit_price").using("btree", table.unitPrice.asc().nullsLast().op("numeric_ops")),
	foreignKey({
			columns: [table.cartId],
			foreignColumns: [carts.id],
			name: "cart_lines_cart_id_carts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.cartId],
			foreignColumns: [carts.id],
			name: "cart_lines_cart_id_fkey"
		}).onDelete("cascade"),
]);

export const orderItems = pgTable("order_items", {
	id: serial().primaryKey().notNull(),
	orderId: integer("order_id").notNull(),
	productId: integer("product_id").notNull(),
	quantity: integer().default(1).notNull(),
	optionChain: text("option_chain"),
	pricingHash: text("pricing_hash"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_order_items_order").using("btree", table.orderId.asc().nullsLast().op("int4_ops")),
	index("idx_order_items_product").using("btree", table.productId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_items_order_id_orders_id_fk"
		}).onDelete("cascade"),
]);

export const orderArtwork = pgTable("order_artwork", {
	id: serial().primaryKey().notNull(),
	orderId: integer("order_id"),
	orderItemId: integer("order_item_id"),
	productId: integer("product_id").notNull(),
	sideIndex: integer("side_index").default(0).notNull(),
	filename: text().notNull(),
	contentType: text("content_type").notNull(),
	storageKey: text("storage_key").notNull(),
	bucket: text().notNull(),
	publicUrl: text("public_url").notNull(),
	sinaliteJobId: text("sinalite_job_id"),
	sinaliteAssetId: text("sinalite_asset_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	orderSessionId: varchar("order_session_id", { length: 64 }),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_artwork_order_id_orders_id_fk"
		}).onDelete("cascade"),
]);

export const productOptionGroups = pgTable("product_option_groups", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	productId: bigint("product_id", { mode: "number" }).notNull(),
	storeCode: smallint("store_code").notNull(),
	name: text(),
	groupKey: text("group_key"),
	groupLabel: text("group_label"),
	meta: jsonb().default({}).notNull(),
	data: jsonb(),
	storeId: integer("store_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sinaProductId: bigint("sina_product_id", { mode: "number" }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	storeLocale: text("store_locale"),
}, (table) => [
	uniqueIndex("ux_pog_product_store_name").using("btree", table.productId.asc().nullsLast().op("text_ops"), table.storeCode.asc().nullsLast().op("int8_ops"), table.name.asc().nullsLast().op("int2_ops")),
	uniqueIndex("ux_pog_store_prod_key").using("btree", table.storeId.asc().nullsLast().op("int8_ops"), table.sinaProductId.asc().nullsLast().op("int8_ops"), table.groupKey.asc().nullsLast().op("int4_ops")),
	uniqueIndex("ux_pog_storecode_prod_group").using("btree", table.storeCode.asc().nullsLast().op("int2_ops"), table.sinaProductId.asc().nullsLast().op("int8_ops"), table.groupKey.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_option_groups_product_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId, table.storeCode],
			foreignColumns: [products.id, products.storeCode],
			name: "product_option_groups_product_fk"
		}).onDelete("cascade"),
	unique("product_option_groups_product_id_store_code_name_key").on(table.productId, table.storeCode, table.name),
	check("product_option_groups_store_code_check", sql`store_code = ANY (ARRAY[6, 9])`),
]);

export const shippingCache = pgTable("shipping_cache", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	productId: bigint("product_id", { mode: "number" }).notNull(),
	storeCode: smallint("store_code").notNull(),
	options: jsonb().notNull(),
	shipCountry: text("ship_country").notNull(),
	shipState: text("ship_state").notNull(),
	shipZip: text("ship_zip").notNull(),
	response: jsonb().notNull(),
	cachedAt: timestamp("cached_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_ship_recent").using("btree", table.productId.asc().nullsLast().op("int8_ops"), table.storeCode.asc().nullsLast().op("timestamptz_ops"), table.cachedAt.desc().nullsFirst().op("int2_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "shipping_cache_product_id_fkey"
		}).onDelete("cascade"),
	unique("shipping_cache_product_id_store_code_options_ship_country_s_key").on(table.productId, table.storeCode, table.options, table.shipCountry, table.shipState, table.shipZip),
	check("shipping_cache_store_code_check", sql`store_code = ANY (ARRAY[6, 9])`),
]);

export const productCombinationValues = pgTable("product_combination_values", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	productId: bigint("product_id", { mode: "number" }).notNull(),
	hash: text().notNull(),
	value: text().notNull(),
	markup: boolean().notNull(),
	storeCode: smallint("store_code").notNull(),
}, (table) => [
	uniqueIndex("ux_pcv_product_hash_store").using("btree", table.productId.asc().nullsLast().op("int8_ops"), table.hash.asc().nullsLast().op("int8_ops"), table.storeCode.asc().nullsLast().op("int2_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_combination_values_product_id_fkey"
		}).onDelete("cascade"),
]);

export const sinaOptionGroups = pgTable("sina_option_groups", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	productId: bigint("product_id", { mode: "number" }).notNull(),
	storeCode: smallint("store_code").default(9).notNull(),
	groupKey: text("group_key").notNull(),
	groupLabel: text("group_label"),
	meta: jsonb().default({}).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId, table.storeCode],
			foreignColumns: [sinaProducts.id, sinaProducts.storeCode],
			name: "sina_option_groups_product_id_store_code_fkey"
		}).onDelete("cascade"),
	unique("sina_option_groups_product_id_store_code_group_key_key").on(table.productId, table.storeCode, table.groupKey),
]);

export const products = pgTable("products", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "products_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	sku: text(),
	name: text(),
	category: text(),
	enabled: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	meta: jsonb().default({}).notNull(),
	sinaProductId: integer("sina_product_id"),
	storeCode: smallint("store_code").default(9).notNull(),
	storeId: integer("store_id"),
	description: text(),
	priceCents: integer("price_cents"),
	currency: text(),
	data: jsonb(),
	storeLocale: text("store_locale"),
}, (table) => [
	index("ix_products_id").using("btree", table.id.asc().nullsLast().op("int8_ops")),
	index("ix_products_store").using("btree", table.storeCode.asc().nullsLast().op("int2_ops")),
	uniqueIndex("ux_products_sina_store").using("btree", table.sinaProductId.asc().nullsLast().op("int4_ops"), table.storeCode.asc().nullsLast().op("int4_ops")),
	uniqueIndex("ux_products_store_sina").using("btree", table.storeId.asc().nullsLast().op("int4_ops"), table.sinaProductId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("ux_products_storecode_sina").using("btree", table.storeCode.asc().nullsLast().op("int2_ops"), table.sinaProductId.asc().nullsLast().op("int4_ops")),
	unique("ux_products_id_store").on(table.id, table.storeCode),
]);

export const sinaOptions = pgTable("sina_options", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	productId: bigint("product_id", { mode: "number" }).notNull(),
	storeCode: smallint("store_code").default(9).notNull(),
	groupKey: text("group_key").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	optionId: bigint("option_id", { mode: "number" }).notNull(),
	optionName: text("option_name").notNull(),
	hidden: smallint().default(0).notNull(),
	sortIndex: integer("sort_index"),
	meta: jsonb().default({}).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId, table.storeCode],
			foreignColumns: [sinaProducts.id, sinaProducts.storeCode],
			name: "sina_options_product_id_store_code_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId, table.storeCode, table.groupKey],
			foreignColumns: [sinaOptionGroups.productId, sinaOptionGroups.storeCode, sinaOptionGroups.groupKey],
			name: "sina_options_product_id_store_code_group_key_fkey"
		}).onDelete("cascade"),
	unique("sina_options_product_id_store_code_group_key_option_id_key").on(table.productId, table.storeCode, table.groupKey, table.optionId),
]);

export const sinaPricingMeta = pgTable("sina_pricing_meta", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	productId: bigint("product_id", { mode: "number" }).notNull(),
	storeCode: smallint("store_code").default(9).notNull(),
	hash: text().notNull(),
	value: text(),
	markup: numeric(),
	meta: jsonb().default({}).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId, table.storeCode],
			foreignColumns: [sinaProducts.id, sinaProducts.storeCode],
			name: "sina_pricing_meta_product_id_store_code_fkey"
		}).onDelete("cascade"),
	unique("sina_pricing_meta_product_id_store_code_hash_key").on(table.productId, table.storeCode, table.hash),
]);

export const loyaltyWallets = pgTable("loyalty_wallets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	customerId: uuid("customer_id").notNull(),
	pointsBalance: integer("points_balance").default(0).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "loyalty_wallets_customer_id_fkey"
		}).onDelete("cascade"),
	unique("loyalty_wallets_customer_id_key").on(table.customerId),
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
	unique("customers_clerk_user_id_key").on(table.clerkUserId),
]);

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
}, (table) => [
	index("idx_addr_customer").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "customer_addresses_customer_id_fkey"
		}).onDelete("cascade"),
]);

export const productOptions = pgTable("product_options", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	productId: bigint("product_id", { mode: "number" }).notNull(),
	sinaOptionId: integer("sina_option_id"),
	groupName: text("group_name").notNull(),
	name: text().notNull(),
	hidden: boolean().default(false).notNull(),
	meta: jsonb().default({}).notNull(),
	storeCode: smallint("store_code").default(9).notNull(),
	groupKey: text("group_key"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	optionId: bigint("option_id", { mode: "number" }),
	optionName: text("option_name"),
	sortIndex: integer("sort_index"),
	optionKey: text("option_key"),
	optionLabel: text("option_label"),
	valueKey: text("value_key"),
	label: text(),
	priceDeltaCents: integer("price_delta_cents"),
	data: jsonb(),
	storeId: integer("store_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sinaProductId: bigint("sina_product_id", { mode: "number" }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	storeLocale: text("store_locale"),
}, (table) => [
	uniqueIndex("ux_po_product_option").using("btree", table.productId.asc().nullsLast().op("int8_ops"), table.sinaOptionId.asc().nullsLast().op("int8_ops")),
	uniqueIndex("ux_po_product_store_group_option").using("btree", table.productId.asc().nullsLast().op("int2_ops"), table.storeCode.asc().nullsLast().op("int8_ops"), table.groupKey.asc().nullsLast().op("int8_ops"), table.optionKey.asc().nullsLast().op("text_ops")),
	uniqueIndex("ux_po_store_prod_group_value").using("btree", sql`store_id`, sql`sina_product_id`, sql`group_key`, sql`COALESCE(value_key, ''::text)`, sql`COALESCE(label, ''::text)`),
	uniqueIndex("ux_po_storecode_prod_group_value").using("btree", sql`store_code`, sql`sina_product_id`, sql`group_key`, sql`COALESCE(value_key, ''::text)`, sql`COALESCE(label, ''::text)`),
	foreignKey({
			columns: [table.productId, table.storeCode, table.groupKey],
			foreignColumns: [productOptionGroups.productId, productOptionGroups.storeCode, productOptionGroups.groupKey],
			name: "product_options_group_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_options_product_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId, table.storeCode],
			foreignColumns: [products.id, products.storeCode],
			name: "product_options_product_fk"
		}).onDelete("cascade"),
]);

export const loyaltyTransactions = pgTable("loyalty_transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	walletId: uuid("wallet_id").notNull(),
	delta: integer().notNull(),
	reason: loyaltyReason().notNull(),
	orderId: integer("order_id"),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_loyalty_wallet").using("btree", table.walletId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.walletId],
			foreignColumns: [loyaltyWallets.id],
			name: "loyalty_transactions_wallet_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "loyalty_transactions_order_id_fkey"
		}),
]);

export const productMeta = pgTable("product_meta", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	productId: bigint("product_id", { mode: "number" }).notNull(),
	storeCode: smallint("store_code").notNull(),
	meta: jsonb().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_meta_product_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.productId, table.storeCode], name: "product_meta_pkey"}),
	check("product_meta_store_code_check", sql`store_code = ANY (ARRAY[6, 9])`),
]);

export const productOptionValues = pgTable("product_option_values", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	valueId: bigint("value_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	groupId: bigint("group_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	productId: bigint("product_id", { mode: "number" }).notNull(),
	storeCode: smallint("store_code").notNull(),
	name: text().notNull(),
	hidden: boolean().default(false).notNull(),
}, (table) => [
	index("idx_pov_group").using("btree", table.groupId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [productOptionGroups.id],
			name: "product_option_values_group_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_option_values_product_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.valueId, table.productId, table.storeCode], name: "product_option_values_pkey"}),
	check("product_option_values_store_code_check", sql`store_code = ANY (ARRAY[6, 9])`),
]);

export const productPricingMeta = pgTable("product_pricing_meta", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	productId: bigint("product_id", { mode: "number" }).notNull(),
	storeCode: integer("store_code").notNull(),
	hash: text().notNull(),
	value: text().notNull(),
	markup: integer().notNull(),
	meta: jsonb().default({}).notNull(),
}, (table) => [
	uniqueIndex("ux_ppm_product_store_hash").using("btree", table.productId.asc().nullsLast().op("int4_ops"), table.storeCode.asc().nullsLast().op("text_ops"), table.hash.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.productId, table.storeCode],
			foreignColumns: [products.id, products.storeCode],
			name: "product_pricing_meta_product_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.productId, table.storeCode, table.hash], name: "product_pricing_meta_pkey"}),
]);

export const pricingMetrics = pgTable("pricing_metrics", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	productId: bigint("product_id", { mode: "number" }).notNull(),
	storeCode: smallint("store_code").notNull(),
	hash: text().notNull(),
	value: text(),
	markup: boolean(),
	raw: jsonb(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "pricing_metrics_product_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.productId, table.storeCode, table.hash], name: "pricing_metrics_pkey"}),
	check("pricing_metrics_store_code_check", sql`store_code = ANY (ARRAY[6, 9])`),
]);

export const sinaProducts = pgTable("sina_products", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).notNull(),
	storeCode: smallint("store_code").default(9).notNull(),
	sku: text(),
	name: text(),
	category: text(),
	enabled: smallint(),
	meta: jsonb().default({}).notNull(),
}, (table) => [
	index("ix_sina_products_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	primaryKey({ columns: [table.id, table.storeCode], name: "sina_products_pkey"}),
]);
