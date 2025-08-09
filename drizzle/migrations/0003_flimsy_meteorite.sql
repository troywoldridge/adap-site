CREATE TABLE "review_helpful_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" integer NOT NULL,
	"user_id" varchar(64),
	"ip" varchar(48),
	"is_helpful" boolean NOT NULL,
	"created_at" timestamp DEFAULT now()
);
