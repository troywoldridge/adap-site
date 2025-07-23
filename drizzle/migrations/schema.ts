import { pgTable, index, serial, text, jsonb, foreignKey, integer, boolean, uniqueIndex, numeric, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const couponStatus = pgEnum("coupon_status", ['ACTIVE', 'EXPIRED'])
export const orderStatus = pgEnum("order_status", ['NEW', 'PENDING', 'PAID', 'SHIPPED', 'CANCELLED', 'COMPLETED'])


export const products = pgTable("products", {
	id: serial().notNull(),
	sku: text().notNull(),
	name: text().notNull(),
	category: text().notNull(),
	metadata: jsonb(),
}, (table) => [
	index("idx_products_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
]);

export const optionsGroups = pgTable("options_groups", {
	id: serial().notNull(),
	productId: integer("product_id").notNull(),
	groupName: text("group_name").notNull(),
}, (table) => [
	index("idx_option_groups_product").using("btree", table.productId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "options_groups_product_id_fkey"
		}).onDelete("cascade"),
]);

export const options = pgTable("options", {
	id: serial().notNull(),
	groupId: integer("group_id").notNull(),
	optionId: integer("option_id").notNull(),
	name: text().notNull(),
	hidden: boolean().default(false),
}, (table) => [
	index("idx_options_group").using("btree", table.groupId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [optionsGroups.id],
			name: "options_group_id_fkey"
		}).onDelete("cascade"),
]);

export const pricing = pgTable("pricing", {
	id: serial().notNull(),
	productId: integer("product_id").notNull(),
	priceHash: text("price_hash").notNull(),
	priceValue: numeric("price_value", { precision: 12, scale:  4 }).notNull(),
	markup: numeric({ precision: 6, scale:  4 }).default('0'),
}, (table) => [
	uniqueIndex("idx_pricing_hash").using("btree", table.priceHash.asc().nullsLast().op("text_ops")),
	index("idx_pricing_product").using("btree", table.productId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "pricing_product_id_fkey"
		}).onDelete("cascade"),
]);

export const productVariants = pgTable("product_variants", {
	id: serial().notNull(),
	productId: integer("product_id").notNull(),
	variantSku: text("variant_sku"),
	optionCombination: jsonb("option_combination"),
}, (table) => [
	index("idx_variant_product").using("btree", table.productId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_variants_product_id_fkey"
		}).onDelete("cascade"),
]);
