CREATE TABLE "cart_artwork" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"line_id" uuid NOT NULL,
	"side" integer DEFAULT 1 NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cart_lines" ADD COLUMN "artwork" jsonb DEFAULT 'null'::jsonb;--> statement-breakpoint
ALTER TABLE "cart_artwork" ADD CONSTRAINT "cart_artwork_line_id_cart_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."cart_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_art_line" ON "cart_artwork" USING btree ("line_id");--> statement-breakpoint
CREATE INDEX "idx_art_side" ON "cart_artwork" USING btree ("side");