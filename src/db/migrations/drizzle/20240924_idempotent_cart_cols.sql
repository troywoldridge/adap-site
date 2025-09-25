-- cart_lines.artwork
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cart_lines' AND column_name='artwork'
  ) THEN
    ALTER TABLE "cart_lines" ADD COLUMN "artwork" jsonb;
  END IF;
END$$;

-- cart_lines.currency (aligns with Sinalite USD/CAD store codes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cart_lines' AND column_name='currency'
  ) THEN
    ALTER TABLE "cart_lines" ADD COLUMN "currency" text NOT NULL DEFAULT 'USD';
  END IF;
END$$;

-- cart_attachments thumbnails for Cloudflare CDN previews
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
