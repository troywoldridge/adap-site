CREATE TYPE "public"."loyalty_reason" AS ENUM('purchase', 'refund', 'adjustment', 'signup', 'promotion');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'submitted', 'paid', 'fulfilled', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"display_name" text,
	"email" text,
	"phone_enc" "bytea",
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"reason" "loyalty_reason" NOT NULL,
	"order_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"points_balance" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_wallets_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_artwork" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "order_artwork" CASCADE;--> statement-breakpoint
ALTER TABLE "cart_lines" DROP CONSTRAINT "cart_lines_cart_id_carts_id_fk";
--> statement-breakpoint
DROP INDEX "idx_cart_artwork_line";--> statement-breakpoint
DROP INDEX "idx_cart_artwork_line_side";--> statement-breakpoint
DROP INDEX "idx_cart_lines_cart";--> statement-breakpoint
DROP INDEX "idx_cart_lines_product";--> statement-breakpoint
DROP INDEX "idx_cart_lines_unit_price";--> statement-breakpoint
DROP INDEX "idx_carts_sid";--> statement-breakpoint
DROP INDEX "idx_carts_user";--> statement-breakpoint
DROP INDEX "idx_carts_status";--> statement-breakpoint
DROP INDEX "idx_cart_attachments_line";--> statement-breakpoint
DROP INDEX "ux_cart_attachments_line_storage";--> statement-breakpoint
DROP INDEX "idx_order_items_product";--> statement-breakpoint
DROP INDEX "idx_orders_user";--> statement-breakpoint
ALTER TABLE "cart_artwork" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cart_artwork" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "cart_lines" ALTER COLUMN "artwork" SET DEFAULT 'null'::jsonb;--> statement-breakpoint
ALTER TABLE "cart_lines" ALTER COLUMN "artwork" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_lines" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cart_lines" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "cart_lines" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cart_lines" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "carts" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "carts" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "carts" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "carts" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "cart_attachments" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "cart_attachments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "cart_attachments" ALTER COLUMN "line_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "cart_attachments" ALTER COLUMN "line_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_attachments" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cart_attachments" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "order_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'submitted'::"public"."order_status";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."order_status" USING "status"::"public"."order_status";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_lines" ADD COLUMN "unit_price_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_lines" ADD COLUMN "line_total_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_lines" ADD COLUMN "priced_option_ids" jsonb DEFAULT 'null'::jsonb;--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "selected_shipping" jsonb DEFAULT 'null'::jsonb;--> statement-breakpoint
ALTER TABLE "cart_attachments" ADD COLUMN "cart_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_attachments" ADD COLUMN "key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_attachments" ADD COLUMN "url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "product_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "unit_cents" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "qty" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "line_total_cents" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_number" text NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "currency" char(3) NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "subtotal_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "total_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "placed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "provider_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "billing_address_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_address_id" uuid;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_wallet_id_loyalty_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."loyalty_wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_wallets" ADD CONSTRAINT "loyalty_wallets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_customers_clerk" ON "customers" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "idx_loyalty_wallet" ON "loyalty_transactions" USING btree ("wallet_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_addr_clerk" ON "customer_addresses" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "idx_addr_customer" ON "customer_addresses" USING btree ("customer_id");--> statement-breakpoint
ALTER TABLE "cart_attachments" ADD CONSTRAINT "cart_attachments_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_attachments" ADD CONSTRAINT "cart_attachments_line_id_cart_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."cart_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_orders_customer" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_orders_provider_id" ON "orders" USING btree ("provider","provider_id");--> statement-breakpoint
ALTER TABLE "cart_artwork" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "cart_lines" DROP COLUMN "unit_price";--> statement-breakpoint
ALTER TABLE "cart_lines" DROP COLUMN "options_by_group";--> statement-breakpoint
ALTER TABLE "cart_lines" DROP COLUMN "sinalite_package_info";--> statement-breakpoint
ALTER TABLE "cart_attachments" DROP COLUMN "product_id";--> statement-breakpoint
ALTER TABLE "cart_attachments" DROP COLUMN "storage_id";--> statement-breakpoint
ALTER TABLE "cart_attachments" DROP COLUMN "file_name";--> statement-breakpoint
ALTER TABLE "cart_attachments" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "quantity";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "pricing_hash";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "total";--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_number_unique" UNIQUE("order_number");