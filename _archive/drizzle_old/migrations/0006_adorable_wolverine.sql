CREATE TABLE "order_artwork" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"order_item_id" integer,
	"product_id" integer NOT NULL,
	"side_index" integer DEFAULT 0 NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"bucket" text NOT NULL,
	"public_url" text NOT NULL,
	"sinalite_job_id" text,
	"sinalite_asset_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"option_chain" text,
	"pricing_hash" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "total" numeric;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "order_artwork" ADD CONSTRAINT "order_artwork_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_artwork_order" ON "order_artwork" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_artwork_order_item" ON "order_artwork" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "idx_artwork_product" ON "order_artwork" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_order" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_product" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_orders_user" ON "orders" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "product_id";