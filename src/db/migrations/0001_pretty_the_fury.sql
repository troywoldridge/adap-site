-- cart_lines.artwork (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cart_lines' AND column_name='artwork'
  ) THEN
    ALTER TABLE "cart_lines" ADD COLUMN "artwork" jsonb;
  END IF;
END$$;

-- cart_lines.currency (SinaLite USD/CAD alignment) — add if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cart_lines' AND column_name='currency'
  ) THEN
    -- add first without NOT NULL / DEFAULT to avoid collisions
    ALTER TABLE "cart_lines" ADD COLUMN "currency" text;
  END IF;
END$$;

-- enforce default + not-null safely (only if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cart_lines' AND column_name='currency'
  ) THEN
    ALTER TABLE "cart_lines" ALTER COLUMN "currency" SET DEFAULT 'USD';
    UPDATE "cart_lines" SET "currency" = 'USD' WHERE "currency" IS NULL;
    ALTER TABLE "cart_lines" ALTER COLUMN "currency" SET NOT NULL;
  END IF;
END$$;

-- thumbnails on cart_attachments (Cloudflare CDN previews)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cart_attachments' AND column_name='thumb_key'
  ) THEN
    ALTER TABLE "cart_attachments" ADD COLUMN "thumb_key" text;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cart_attachments' AND column_name='thumb_url'
  ) THEN
    ALTER TABLE "cart_attachments" ADD COLUMN "thumb_url" text;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cart_attachments' AND column_name='cf_image_id'
  ) THEN
    ALTER TABLE "cart_attachments" ADD COLUMN "cf_image_id" text;
  END IF;
END$$;
