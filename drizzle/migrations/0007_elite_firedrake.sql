CREATE TABLE "cart_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"line_id" text NOT NULL,
	"product_id" integer NOT NULL,
	"storage_id" text NOT NULL,
	"file_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "idx_artwork_order";--> statement-breakpoint
DROP INDEX "idx_artwork_order_item";--> statement-breakpoint
DROP INDEX "idx_artwork_product";--> statement-breakpoint
ALTER TABLE "order_artwork" ALTER COLUMN "order_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "order_sessions" ALTER COLUMN "notes" SET DATA TYPE varchar(1000);--> statement-breakpoint
ALTER TABLE "order_artwork" ADD COLUMN "order_session_id" varchar(64);--> statement-breakpoint
CREATE INDEX "idx_cart_attachments_line" ON "cart_attachments" USING btree ("line_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_cart_attachments_line_storage" ON "cart_attachments" USING btree ("line_id","storage_id");