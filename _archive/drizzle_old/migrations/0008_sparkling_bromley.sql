CREATE TABLE "cart_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" integer NOT NULL,
	"option_ids" jsonb DEFAULT 'null'::jsonb,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sid" text NOT NULL,
	"user_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cart_lines" ADD CONSTRAINT "cart_lines_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cart_lines_cart" ON "cart_lines" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "idx_cart_lines_product" ON "cart_lines" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_carts_sid" ON "carts" USING btree ("sid");--> statement-breakpoint
CREATE INDEX "idx_carts_user" ON "carts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_carts_status" ON "carts" USING btree ("status");