ALTER TABLE "cart_artwork" DROP CONSTRAINT "cart_artwork_line_id_cart_lines_id_fk";
--> statement-breakpoint
DROP INDEX "idx_art_line";--> statement-breakpoint
DROP INDEX "idx_art_side";--> statement-breakpoint
ALTER TABLE "cart_artwork" ALTER COLUMN "side" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "cart_lines" ALTER COLUMN "artwork" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "cart_lines" ALTER COLUMN "artwork" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_artwork" ADD COLUMN "cart_line_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_artwork" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_artwork" ADD CONSTRAINT "cart_artwork_cart_line_id_cart_lines_id_fk" FOREIGN KEY ("cart_line_id") REFERENCES "public"."cart_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cart_artwork_line" ON "cart_artwork" USING btree ("cart_line_id");--> statement-breakpoint
CREATE INDEX "idx_cart_artwork_line_side" ON "cart_artwork" USING btree ("cart_line_id","side");--> statement-breakpoint
ALTER TABLE "cart_artwork" DROP COLUMN "line_id";