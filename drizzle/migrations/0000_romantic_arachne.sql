-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."coupon_status" AS ENUM('ACTIVE', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('NEW', 'PENDING', 'PAID', 'SHIPPED', 'CANCELLED', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "options_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"group_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"metadata" jsonb,
	"subcategory_id" integer,
	"slug" text,
	"category_id" text,
	"sinalite_id" text,
	CONSTRAINT "products_sku_key" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"variant_sku" text,
	"option_combination" jsonb,
	CONSTRAINT "product_variants_variant_sku_key" UNIQUE("variant_sku")
);
--> statement-breakpoint
CREATE TABLE "subcategories" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subcategories_category_slug_unique" UNIQUE("category_id","slug")
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"sku" text,
	"option_id" text,
	"group" text NOT NULL,
	"name" text NOT NULL,
	"hidden" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"category_id" integer,
	CONSTRAINT "categories_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text,
	"cdn_filename" text,
	"cloudflare_id" text,
	"image_url" text,
	"is_matched" boolean DEFAULT false,
	"product_id" integer,
	"category_id" text,
	"subcategory_id" integer,
	"variant" text DEFAULT 'public',
	"alt" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"category_id_slug" text
);
--> statement-breakpoint
CREATE TABLE "pricing" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"product" text NOT NULL,
	"row_number" integer NOT NULL,
	"hash" text NOT NULL,
	"value" text NOT NULL,
	"type" text NOT NULL,
	"markup" integer,
	"numeric_value" numeric,
	"width" numeric,
	"height" numeric,
	"depth" numeric,
	"raw_dimensions" text
);
--> statement-breakpoint
CREATE TABLE "image_category_links" (
	"cloudflare_id" text NOT NULL,
	"filename" text,
	"guessed_subcategory_name" text,
	"guessed_category_name" text
);
--> statement-breakpoint
CREATE TABLE "image_import" (
	"category_id" text,
	"subcategory_id" integer,
	"alt" text,
	"filename" text,
	"cloudflare_id" text
);
--> statement-breakpoint
ALTER TABLE "options_groups" ADD CONSTRAINT "options_groups_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "fk_product" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "fk_category" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "fk_subcategory" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "fk_category_slug" FOREIGN KEY ("category_id_slug") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_option_groups_product" ON "options_groups" USING btree ("product_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_products_category" ON "products" USING btree ("category" text_ops);--> statement-breakpoint
CREATE INDEX "idx_variant_product" ON "product_variants" USING btree ("product_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_options_group" ON "options" USING btree ("group" text_ops);--> statement-breakpoint
CREATE INDEX "idx_options_option_id" ON "options" USING btree ("option_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_options_product_id" ON "options" USING btree ("product_id" int4_ops);
*/