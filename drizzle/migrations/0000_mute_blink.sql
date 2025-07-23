-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."coupon_status" AS ENUM('ACTIVE', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('NEW', 'PENDING', 'PAID', 'SHIPPED', 'CANCELLED', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "options_groups" (
	"id" serial NOT NULL,
	"product_id" integer NOT NULL,
	"group_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" serial NOT NULL,
	"group_id" integer NOT NULL,
	"option_id" integer NOT NULL,
	"name" text NOT NULL,
	"hidden" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "pricing" (
	"id" serial NOT NULL,
	"product_id" integer NOT NULL,
	"price_hash" text NOT NULL,
	"price_value" numeric(12, 4) NOT NULL,
	"markup" numeric(6, 4) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" serial NOT NULL,
	"product_id" integer NOT NULL,
	"variant_sku" text,
	"option_combination" jsonb
);
--> statement-breakpoint
ALTER TABLE "options_groups" ADD CONSTRAINT "options_groups_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."options_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing" ADD CONSTRAINT "pricing_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_products_category" ON "products" USING btree ("category" text_ops);--> statement-breakpoint
CREATE INDEX "idx_option_groups_product" ON "options_groups" USING btree ("product_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_options_group" ON "options" USING btree ("group_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pricing_hash" ON "pricing" USING btree ("price_hash" text_ops);--> statement-breakpoint
CREATE INDEX "idx_pricing_product" ON "pricing" USING btree ("product_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_variant_product" ON "product_variants" USING btree ("product_id" int4_ops);
*/