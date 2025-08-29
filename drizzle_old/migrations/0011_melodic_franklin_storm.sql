ALTER TABLE "cart_lines" ALTER COLUMN "option_ids" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "cart_lines" ALTER COLUMN "option_ids" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_lines" ADD COLUMN "unit_price" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_lines" ADD COLUMN "options_by_group" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_lines" ADD COLUMN "sinalite_package_info" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_cart_lines_unit_price" ON "cart_lines" USING btree ("unit_price");