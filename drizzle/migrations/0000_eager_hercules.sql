CREATE TABLE "product_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" varchar(48) NOT NULL,
	"name" varchar(60) NOT NULL,
	"email" varchar(80),
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"approved" boolean DEFAULT false,
	"user_ip" varchar(45),
	"terms_agreed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
