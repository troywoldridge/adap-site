import {
	pgTable, index, foreignKey, serial, integer, text, unique, jsonb,
	timestamp, boolean, pgEnum, numeric
} from "drizzle-orm/pg-core"

import { sql } from "drizzle-orm"

export const couponStatus = pgEnum("coupon_status", ['ACTIVE', 'EXPIRED'])
export const orderStatus = pgEnum("order_status", ['NEW', 'PENDING', 'PAID', 'SHIPPED', 'CANCELLED', 'COMPLETED'])

export const categories = pgTable("categories", {
	id: text().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("categories_slug_key").on(table.slug),
]);

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

export const products = pgTable("products", {
	id: serial().primaryKey().notNull(),
	sku: text().notNull(),
	name: text().notNull(),
	categoryLabel: text("category").notNull(),
	metadata: jsonb(),
	subcategoryId: integer("subcategory_id"),
	slug: text(),
	categoryId: text("category_id"),
	sinaliteId: text("sinalite_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_products_category").using("btree", table.categoryLabel.asc().nullsLast().op("text_ops")),
	unique("products_sku_key").on(table.sku),
]);

export const optionsGroups = pgTable("options_groups", {
	id: serial().primaryKey().notNull(),
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
	id: serial("id").primaryKey().notNull(),
	productId: integer("product_id").notNull(),
	sku: text(),
	optionId: text("option_id"),
	group: text().notNull(),
	name: text().notNull(),
	hidden: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_options_group").using("btree", table.group.asc().nullsLast().op("text_ops")),
	index("idx_options_option_id").using("btree", table.optionId.asc().nullsLast().op("text_ops")),
	index("idx_options_product_id").using("btree", table.productId.asc().nullsLast().op("int4_ops")),
	foreignKey({
		columns: [table.productId],
		foreignColumns: [products.id],
		name: "options_product_id_fkey"
	}).onDelete("cascade"),
]);

export const productVariants = pgTable("product_variants", {
	id: serial().primaryKey().notNull(),
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
	unique("product_variants_variant_sku_key").on(table.variantSku),
]);

export const pricing = pgTable("pricing", {
	id: serial().primaryKey().notNull(),
	category: text().notNull(),
	product: integer("product_id").notNull(),
	rowNumber: integer("row_number").notNull(),
	hash: text().notNull(),
	value: numeric("value").notNull(), // changed from text()
	type: text().notNull(),
	markup: integer(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.product],
		foreignColumns: [products.id],
		name: "pricing_product_id_fkey"
	}).onDelete("cascade"),
]);
