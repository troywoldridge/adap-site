import { pgTable, unique, serial, integer, text, numeric, timestamp, index, foreignKey, varchar, uniqueIndex, boolean, jsonb, uuid, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const couponStatus = pgEnum("coupon_status", ['ACTIVE', 'EXPIRED'])
export const orderStatus = pgEnum("order_status", ['NEW', 'PENDING', 'PAID', 'SHIPPED', 'CANCELLED', 'COMPLETED'])


export const productPricing = pgTable("product_pricing", {
	id: serial().primaryKey().notNull(),
	productId: integer("product_id").notNull(),
	optionIds: text("option_ids").notNull(),
	optionChain: text("option_chain").notNull(),
	priceValue: numeric("price_value").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("product_pricing_product_id_option_chain_key").on(table.productId, table.optionChain),
]);

export const optionsGroups = pgTable("options_groups", {
	id: serial().notNull(),
	productId: integer("product_id").notNull(),
	groupName: text("group_name").notNull(),
}, (table) => [
	index("idx_options_groups_group_name").using("btree", table.groupName.asc().nullsLast().op("text_ops")),
	index("idx_options_groups_product_id").using("btree", table.productId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "options_groups_product_fk"
		}).onDelete("cascade"),
]);

export const productOptionHashes = pgTable("product_option_hashes", {
	id: serial().notNull(),
	productId: integer("product_id").notNull(),
	optionChain: varchar("option_chain", { length: 255 }).notNull(),
	hash: varchar({ length: 32 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	pricingId: integer("pricing_id"),
	optionIds: varchar("option_ids", { length: 255 }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_poh_hash").using("btree", table.hash.asc().nullsLast().op("text_ops")),
	index("idx_poh_pricing_id").using("btree", table.pricingId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "poh_product_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.pricingId],
			foreignColumns: [pricing.id],
			name: "poh_pricing_fk"
		}).onDelete("set null"),
	unique("product_hash_unique").on(table.productId, table.hash),
	unique("product_chain_unique").on(table.productId, table.optionChain),
]);

export const products = pgTable("products", {
	id: integer().primaryKey().notNull(),
	sku: text(),
	name: text(),
	category: text(),
	enabled: boolean(),
	metadataJson: jsonb("metadata_json"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	canonicalUuid: uuid("canonical_uuid").defaultRandom().notNull(),
	slug: text(),
}, (table) => [
	uniqueIndex("idx_products_canonical_uuid").using("btree", table.canonicalUuid.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("idx_products_sku").using("btree", table.sku.asc().nullsLast().op("text_ops")),
	uniqueIndex("idx_products_slug").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const productSyncLogs = pgTable("product_sync_logs", {
	id: serial().notNull(),
	productId: integer("product_id"),
	syncMessage: text("sync_message"),
	syncedAt: timestamp("synced_at", { mode: 'string' }).defaultNow(),
});

export const subcategories = pgTable("subcategories", {
	id: serial().primaryKey().notNull(),
	categoryId: text("category_id").notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "subcategories_category_id_fkey"
		}).onDelete("cascade"),
	unique("subcategories_category_slug_unique").on(table.categoryId, table.slug),
]);

export const categories = pgTable("categories", {
	id: text().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	categoryId: integer("category_id"),
	canonicalUuid: uuid("canonical_uuid").defaultRandom().notNull(),
}, (table) => [
	uniqueIndex("idx_categories_canonical_uuid").using("btree", table.canonicalUuid.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("idx_categories_slug").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	unique("categories_slug_key").on(table.slug),
]);

export const options = pgTable("options", {
	productId: integer("product_id"),
	groupName: text("group_name"),
	optionId: integer("option_id"),
	name: text(),
	htmlType: text("html_type"),
	optSortOrder: integer("opt_sort_order"),
	optValId: integer("opt_val_id"),
	optionVal: text("option_val"),
	imgSrc: text("img_src"),
	optValSortOrder: integer("opt_val_sort_order"),
	extraTurnaroundDays: integer("extra_turnaround_days"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_options_group_name").using("btree", table.groupName.asc().nullsLast().op("text_ops")),
	index("idx_options_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("idx_options_option_id").using("btree", table.optionId.asc().nullsLast().op("int4_ops")),
	index("idx_options_product_id").using("btree", table.productId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "options_product_fk"
		}).onDelete("cascade"),
]);

export const pricing = pgTable("pricing", {
	productId: integer("product_id"),
	hash: text(),
	value: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	id: serial().primaryKey().notNull(),
}, (table) => [
	index("idx_pricing_product_hash").using("btree", table.productId.asc().nullsLast().op("int4_ops"), table.hash.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "pricing_product_fk"
		}).onDelete("cascade"),
]);

export const imageCategoryLinks = pgTable("image_category_links", {
	cloudflareId: text("cloudflare_id").notNull(),
	filename: text(),
	guessedSubcategoryName: text("guessed_subcategory_name"),
	guessedCategoryName: text("guessed_category_name"),
});

export const productVariants = pgTable("product_variants", {
	id: serial().notNull(),
	productId: integer("product_id").notNull(),
	variantSku: text("variant_sku"),
	optionCombination: jsonb("option_combination"),
});

export const images = pgTable("images", {
	id: serial().notNull(),
	filename: text(),
	cdnFilename: text("cdn_filename"),
	cloudflareId: text("cloudflare_id"),
	imageUrl: text("image_url"),
	isMatched: boolean("is_matched").default(false),
	productId: integer("product_id"),
	categoryId: text("category_id"),
	subcategoryId: integer("subcategory_id"),
	variant: text().default('public'),
	alt: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	categoryIdSlug: text("category_id_slug"),
}, (table) => [
	index("idx_images_category_id").using("btree", table.categoryId.asc().nullsLast().op("text_ops")),
	index("idx_images_product_id").using("btree", table.productId.asc().nullsLast().op("int4_ops")),
	index("idx_images_subcategory_id").using("btree", table.subcategoryId.asc().nullsLast().op("int4_ops")),
	index("idx_images_variant").using("btree", table.variant.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "images_product_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "images_category_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.subcategoryId],
			foreignColumns: [subcategories.id],
			name: "images_subcategory_fk"
		}).onDelete("set null"),
]);

export const imageImport = pgTable("image_import", {
	categoryId: text("category_id"),
	subcategoryId: integer("subcategory_id"),
	alt: text(),
	filename: text(),
	cloudflareId: text("cloudflare_id"),
});

export const productDenormTmp = pgTable("product_denorm_tmp", {
	productId: integer("product_id"),
	productUuid: uuid("product_uuid"),
	sku: text(),
	productName: text("product_name"),
	productCategory: text("product_category"),
	enabled: boolean(),
	pricingHash: text("pricing_hash"),
	pricingValue: text("pricing_value"),
	optionChain: text("option_chain"),
	optionHash: text("option_hash"),
	imageId: integer("image_id"),
	imageUrl: text("image_url"),
	variant: text(),
	alt: text(),
});
