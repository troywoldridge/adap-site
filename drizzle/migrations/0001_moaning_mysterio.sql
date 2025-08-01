CREATE TABLE "product_option_hashes" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"option_ids" varchar(255) NOT NULL,
	"option_chain" varchar(64) NOT NULL,
	"hash" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_sku_key";--> statement-breakpoint
DROP INDEX "idx_products_category";--> statement-breakpoint
DROP INDEX "idx_options_group";--> statement-breakpoint
DROP INDEX "idx_options_option_id";--> statement-breakpoint
DROP INDEX "idx_options_product_id";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "options" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "options" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing" ADD COLUMN "product_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing" DROP COLUMN "product";