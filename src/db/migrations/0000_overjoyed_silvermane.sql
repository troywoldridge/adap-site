-- Ensure gen_random_uuid() is available (safe if already installed)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'currency_code' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.currency_code AS ENUM ('USD','CAD');
  ELSE
    BEGIN ALTER TYPE public.currency_code ADD VALUE IF NOT EXISTS 'USD'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE public.currency_code ADD VALUE IF NOT EXISTS 'CAD'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'loyalty_reason' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.loyalty_reason AS ENUM ('purchase','refund','adjustment','signup','promotion');
  ELSE
    BEGIN ALTER TYPE public.loyalty_reason ADD VALUE IF NOT EXISTS 'purchase';   EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE public.loyalty_reason ADD VALUE IF NOT EXISTS 'refund';     EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE public.loyalty_reason ADD VALUE IF NOT EXISTS 'adjustment'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE public.loyalty_reason ADD VALUE IF NOT EXISTS 'signup';     EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE public.loyalty_reason ADD VALUE IF NOT EXISTS 'promotion';  EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'order_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.order_status AS ENUM ('draft','submitted','paid','fulfilled','cancelled','refunded');
  ELSE
    BEGIN ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'draft';     EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'submitted'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'paid';      EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'fulfilled'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'cancelled'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'refunded';  EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "carts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sid" text NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "user_id" text,
  "currency" text DEFAULT 'USD' NOT NULL,
  "selected_shipping" jsonb DEFAULT 'null'::jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "cart_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cart_id" uuid NOT NULL,
  "product_id" integer NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "unit_price_cents" integer DEFAULT 0 NOT NULL,
  "line_total_cents" integer,
  "option_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "cart_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cart_id" uuid,
  "line_id" uuid,
  "product_id" integer NOT NULL,
  "file_name" text NOT NULL,
  "key" text NOT NULL,
  "url" text NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "cart_artwork" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cart_line_id" uuid NOT NULL,
  "side" integer NOT NULL,
  "url" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "customers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clerk_user_id" text NOT NULL,
  "display_name" text,
  "email" text NOT NULL,
  "phone_enc" bytea,
  "marketing_opt_in" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

-- Optional: enforce uniqueness via index (no-op if a same-named index/constraint exists)
CREATE UNIQUE INDEX IF NOT EXISTS "customers_clerk_user_id_unique"
  ON "customers" ("clerk_user_id");

CREATE TABLE IF NOT EXISTS "loyalty_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "wallet_id" uuid NOT NULL,
  "delta" integer NOT NULL,
  "reason" "loyalty_reason" NOT NULL,
  "order_id" uuid,
  "note" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "loyalty_wallets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid NOT NULL,
  "points_balance" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_wallets_customer_id_unique"
  ON "loyalty_wallets" ("customer_id");

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "product_id" integer NOT NULL,
  "name" text,
  "quantity" integer DEFAULT 1 NOT NULL,
  "unit_price_cents" integer DEFAULT 0 NOT NULL,
  "line_total_cents" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "order_number" text,
  "currency" char(3),
  "subtotal_cents" integer DEFAULT 0 NOT NULL,
  "tax_cents" integer DEFAULT 0 NOT NULL,
  "shipping_cents" integer DEFAULT 0 NOT NULL,
  "discount_cents" integer DEFAULT 0 NOT NULL,
  "total_cents" integer DEFAULT 0 NOT NULL,
  "placed_at" timestamptz,
  "provider" text,
  "provider_id" text,
  "customer_id" text,
  "billing_address_id" uuid,
  "shipping_address_id" uuid,
  "total" numeric,
  "cart_id" uuid,
  "payment_status" text DEFAULT 'paid',
  "credits_cents" integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "customer_addresses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clerk_user_id" text NOT NULL,
  "customer_id" uuid,
  "label" text,
  "first_name" text,
  "last_name" text,
  "company" text,
  "phone" text,
  "street1" text NOT NULL,
  "street2" text,
  "city" text NOT NULL,
  "state" text NOT NULL,
  "postal_code" text NOT NULL,
  "country" text NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "product_reviews" (
  "id" serial PRIMARY KEY NOT NULL,
  "product_id" varchar(48) NOT NULL,
  "name" varchar(60) NOT NULL,
  "email" varchar(80),
  "rating" integer NOT NULL,
  "comment" text NOT NULL,
  "approved" boolean DEFAULT false NOT NULL,
  "user_ip" varchar(45),
  "terms_agreed" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "review_helpful_votes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "review_id" integer NOT NULL,
  "voter_fingerprint" varchar(64) NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "artwork_uploads" (
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

CREATE TABLE IF NOT EXISTS "order_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar(64),
  "product_id" varchar(64) NOT NULL,
  "options" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "files" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "shipping_info" jsonb,
  "billing_info" jsonb,
  "tracking_url" varchar(255),
  "currency" varchar(8) DEFAULT 'USD' NOT NULL,
  "subtotal" numeric DEFAULT '0' NOT NULL,
  "tax" numeric DEFAULT '0' NOT NULL,
  "discount" numeric DEFAULT '0' NOT NULL,
  "total" numeric DEFAULT '0' NOT NULL,
  "selected_shipping_rate" jsonb,
  "stripe_checkout_session_id" varchar(128),
  "stripe_payment_intent_id" varchar(128),
  "sinalite_order_id" varchar(64),
  "notes" varchar(1000),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Optional column backfills (uncomment if you discover a missing column)
-- ALTER TABLE carts            ADD COLUMN IF NOT EXISTS ...;
-- ALTER TABLE cart_lines       ADD COLUMN IF NOT EXISTS ...;
-- (repeat as needed)

-- ─────────────────────────────────────────────────────────────────────────────
-- FKs (idempotent via pg_constraint check)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cart_lines_cart_id_carts_id_fk') THEN
    ALTER TABLE "cart_lines"
      ADD CONSTRAINT "cart_lines_cart_id_carts_id_fk"
      FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cart_attachments_cart_id_carts_id_fk') THEN
    ALTER TABLE "cart_attachments"
      ADD CONSTRAINT "cart_attachments_cart_id_carts_id_fk"
      FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cart_attachments_line_id_cart_lines_id_fk') THEN
    ALTER TABLE "cart_attachments"
      ADD CONSTRAINT "cart_attachments_line_id_cart_lines_id_fk"
      FOREIGN KEY ("line_id") REFERENCES "public"."cart_lines"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cart_artwork_cart_line_id_cart_lines_id_fk') THEN
    ALTER TABLE "cart_artwork"
      ADD CONSTRAINT "cart_artwork_cart_line_id_cart_lines_id_fk"
      FOREIGN KEY ("cart_line_id") REFERENCES "public"."cart_lines"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='loyalty_transactions_wallet_id_loyalty_wallets_id_fk') THEN
    ALTER TABLE "loyalty_transactions"
      ADD CONSTRAINT "loyalty_transactions_wallet_id_loyalty_wallets_id_fk"
      FOREIGN KEY ("wallet_id") REFERENCES "public"."loyalty_wallets"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='loyalty_transactions_order_id_orders_id_fk') THEN
    ALTER TABLE "loyalty_transactions"
      ADD CONSTRAINT "loyalty_transactions_order_id_orders_id_fk"
      FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='loyalty_wallets_customer_id_customers_id_fk') THEN
    ALTER TABLE "loyalty_wallets"
      ADD CONSTRAINT "loyalty_wallets_customer_id_customers_id_fk"
      FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='customer_addresses_customer_id_customers_id_fk') THEN
    ALTER TABLE "customer_addresses"
      ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk"
      FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='review_helpful_votes_review_id_product_reviews_id_fk') THEN
    ALTER TABLE "review_helpful_votes"
      ADD CONSTRAINT "review_helpful_votes_review_id_product_reviews_id_fk"
      FOREIGN KEY ("review_id") REFERENCES "public"."product_reviews"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES (all IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "idx_carts_sid"     ON "carts" ("sid");
CREATE INDEX IF NOT EXISTS "idx_carts_status"  ON "carts" ("status");
CREATE INDEX IF NOT EXISTS "idx_carts_user"    ON "carts" ("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "cart_attachments_line_key_uq" ON "cart_attachments" ("line_id","key");
CREATE INDEX IF NOT EXISTS "cart_attachments_cart_id_idx" ON "cart_attachments" ("cart_id");
CREATE INDEX IF NOT EXISTS "cart_attachments_line_id_idx" ON "cart_attachments" ("line_id");

CREATE INDEX IF NOT EXISTS "idx_customers_clerk" ON "customers" ("clerk_user_id");
CREATE INDEX IF NOT EXISTS "idx_customers_email" ON "customers" ("email");

CREATE INDEX IF NOT EXISTS "idx_loyalty_wallet" ON "loyalty_transactions" ("wallet_id","created_at");

CREATE INDEX IF NOT EXISTS "order_items_order_id_idx"   ON "order_items" ("order_id");
CREATE INDEX IF NOT EXISTS "order_items_product_id_idx" ON "order_items" ("product_id");
CREATE UNIQUE INDEX IF NOT EXISTS "order_items_order_id_product_id_uq" ON "order_items" ("order_id","product_id");

CREATE INDEX IF NOT EXISTS "orders_customer_id_idx"          ON "orders" ("customer_id");
CREATE INDEX IF NOT EXISTS "orders_provider_provider_id_idx" ON "orders" ("provider","provider_id");

CREATE INDEX IF NOT EXISTS "idx_addr_clerk"    ON "customer_addresses" ("clerk_user_id");
CREATE INDEX IF NOT EXISTS "idx_addr_customer" ON "customer_addresses" ("customer_id");

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_addr_default_by_clerk"
  ON "customer_addresses" ("clerk_user_id")
  WHERE "customer_addresses"."is_default" = true;

CREATE INDEX IF NOT EXISTS "idx_reviews_product"  ON "product_reviews" ("product_id");
CREATE INDEX IF NOT EXISTS "idx_reviews_approved" ON "product_reviews" ("approved");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_helpful_review_voter"
  ON "review_helpful_votes" ("review_id","voter_fingerprint");

CREATE INDEX IF NOT EXISTS "idx_helpful_by_review"
  ON "review_helpful_votes" ("review_id");
