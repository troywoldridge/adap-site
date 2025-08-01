import {
  pgTable,
  index,
  foreignKey,
  serial,
  integer,
  text,
  unique,
  jsonb,
  timestamp,
  boolean,
  pgEnum,
  numeric,
  varchar
} from "drizzle-orm/pg-core";

export const couponStatus = pgEnum("coupon_status", ['ACTIVE', 'EXPIRED']);
export const orderStatus = pgEnum("order_status", ['NEW', 'PENDING', 'PAID', 'SHIPPED', 'CANCELLED', 'COMPLETED']);

export const categories = pgTable("categories", {
  id: text().primaryKey().notNull(),
  slug: text().notNull(),
  name: text().notNull(),
  description: text().default('').notNull(), // ← no `nullable()`, so just default to empty string or handle with `.default(null)`
  hidden: boolean("hidden").default(false),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", { mode: 'date' }).defaultNow(),
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

export const product_option_hashes = pgTable("product_option_hashes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  optionIds: varchar("option_ids", { length: 255 }).notNull(), // Or `text("option_ids")` if no limit
  optionChain: varchar("option_chain", { length: 255 }).notNull(),
  hash: varchar("hash", { length: 32 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
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

export const pricing = pgTable("pricing", {
  id: serial().primaryKey().notNull(),
  category: text().notNull(),
  product: integer("product_id").notNull(),
  rowNumber: integer("row_number").notNull(),
  hash: text().notNull(),
  value: numeric("value").notNull(),
  type: text().notNull(),
  markup: integer(),
  numericValue: numeric("numeric_value"),
  width: numeric("width"),
  height: numeric("height"),
  depth: numeric("depth"),
  rawDimensions: text("raw_dimensions"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.product],
    foreignColumns: [products.id],
    name: "pricing_product_id_fkey"
  }).onDelete("cascade"),
]);

export const images = pgTable("images", {
  id: serial("id").primaryKey().notNull(),
  filename: text("filename").notNull(),
  cdnFilename: text("cdn_filename"),
  cloudflareId: text("cloudflare_id").notNull(),
  imageUrl: text("image_url").notNull(),
  isMatched: boolean("is_matched").default(false),
  productId: integer("product_id"),
  categoryId: text("category_id"),
  subcategoryId: integer("subcategory_id"),
  variant: text("variant").default("public"),
  alt: text("alt"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.productId], foreignColumns: [products.id] }).onDelete("set null"),
  foreignKey({ columns: [table.categoryId], foreignColumns: [categories.id] }).onDelete("set null"),
  foreignKey({ columns: [table.subcategoryId], foreignColumns: [subcategories.id] }).onDelete("set null"),
]);
