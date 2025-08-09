CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"email" varchar(80) NOT NULL,
	"product_id" varchar(48) NOT NULL,
	"status" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "product_reviews" ADD COLUMN "verified" boolean DEFAULT false;