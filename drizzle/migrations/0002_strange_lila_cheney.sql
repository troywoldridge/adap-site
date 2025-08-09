CREATE TABLE "artwork_uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" varchar(48) NOT NULL,
	"order_id" varchar(48),
	"user_id" varchar(64),
	"file_url" varchar(255) NOT NULL,
	"file_name" varchar(128) NOT NULL,
	"file_size" integer,
	"file_type" varchar(64),
	"approved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
