import { pgTable, index, foreignKey, serial, integer, text, unique, jsonb, timestamp, boolean, numeric, pgEnum, varchar } from "drizzle-orm/pg-core"


export const couponStatus = pgEnum("coupon_status", ['ACTIVE', 'EXPIRED'])
export const orderStatus = pgEnum("order_status", ['NEW', 'PENDING', 'PAID', 'SHIPPED', 'CANCELLED', 'COMPLETED'])


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

export const products = pgTable("products", {
  id: serial("id").primaryKey().notNull(),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  metadata: jsonb("metadata"),
  subcategory_id: integer("subcategory_id"),
  slug: text("slug"),
  category_id: text("category_id"),
  sinalite_id: text("sinalite_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});


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

export const product_option_hashes = pgTable("product_option_hashes", (pg) => ({
  id: pg.serial("id").primaryKey(),
  productId: pg.integer("product_id").notNull(),
  optionIds: pg.varchar("option_ids", { length: 255 }).notNull(),
  optionChain: pg.varchar("option_chain", { length: 64 }).notNull(),
  hash: pg.varchar("hash", { length: 64 }).notNull(),
  createdAt: pg.timestamp("created_at").defaultNow(),
  updatedAt: pg.timestamp("updated_at").defaultNow(),
}));

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

export const options = pgTable("options", {
  id: serial("id").primaryKey().notNull(),
  product_id: integer("product_id").notNull(),
  sku: text("sku"),
  option_id: text("option_id"),
  group: text("group").notNull(),
  name: text("name").notNull(),
  hidden: boolean("hidden").default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});


export const categories = pgTable("categories", {
	id: text().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	categoryId: integer("category_id"),
}, (table) => [
	unique("categories_slug_key").on(table.slug),
]);

export const images = pgTable("images", {
	id: serial().primaryKey().notNull(),
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
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "fk_product"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "fk_category"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.subcategoryId],
			foreignColumns: [subcategories.id],
			name: "fk_subcategory"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.categoryIdSlug],
			foreignColumns: [categories.id],
			name: "fk_category_slug"
		}).onDelete("set null"),
]);

export const pricing = pgTable("pricing", {
  id: serial("id").primaryKey().notNull(),
  category: text("category").notNull(),
  product_id: integer("product_id").notNull(),
  row_number: integer("row_number").notNull(),
  hash: text("hash").notNull(),
  value: text("value").notNull(),
  type: text("type").notNull(),
  markup: integer("markup"),
  numeric_value: numeric("numeric_value"),
  width: numeric("width"),
  height: numeric("height"),
  depth: numeric("depth"),
  raw_dimensions: text("raw_dimensions"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});


export const imageCategoryLinks = pgTable("image_category_links", {
	cloudflareId: text("cloudflare_id").notNull(),
	filename: text(),
	guessedSubcategoryName: text("guessed_subcategory_name"),
	guessedCategoryName: text("guessed_category_name"),
});

export const imageImport = pgTable("image_import", {
	categoryId: text("category_id"),
	subcategoryId: integer("subcategory_id"),
	alt: text(),
	filename: text(),
	cloudflareId: text("cloudflare_id"),
});
