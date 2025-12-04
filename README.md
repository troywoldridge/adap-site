# ADAP Site

This repository contains the ADAP storefront built on Next.js with a Postgres backend managed through Drizzle. It integrates Clerk for authentication and Stripe for payments so contributors can finish the site without digging through the codebase.

## Project Purpose
- Customer-facing storefront that surfaces SinaLite products, pricing, and shipping.
- Supports secure checkout and order capture via Stripe.
- Uses Clerk for user authentication/session management.
- Syncs catalog, pricing, and assets from SinaLite APIs and Cloudflare R2 so merch data stays fresh.

## Architecture Overview
- **Next.js app router** (`src/app`) with shared UI in `src/components` and client utilities in `src/client`/`src/hooks`.
- **Database**: Postgres schema defined with Drizzle (`src/db/schema`), migrations in `src/db/migrations`, and connection helper in `src/lib/db.ts`.
- **Authentication**: Clerk middleware (`src/middleware.ts`) and helpers in `src/lib/auth.ts` / `src/lib/authz.ts`.
- **Payments**: Stripe server utilities in `src/lib/stripe.ts` plus public loader in `src/lib/stripe-public.ts`; webhook handler lives under `src/app/api/stripe`.
- **Catalog + pricing**: SinaLite client/server helpers in `src/lib/sinalite.*`, pricing utilities in `src/lib/pricing.ts`, and static data in `data/` and `table_data/`.
- **Assets & CDN**: Cloudflare R2 helpers (`src/lib/r2.js`, `src/lib/r2Public.ts`, `src/lib/cfImages.ts`) and public assets in `public/`.

## Required Environment Variables
Create `.env.local` (dev) or host-level variables (prod). Key values include:
- **Database**: `DATABASE_URL` (Postgres connection string).
- **Stripe**: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, optional `STRIPE_API_VERSION`.
- **Clerk**: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- **Email**: `RESEND_API_KEY`.
- **SinaLite API**: `SINALITE_BASE_URL` (or `SINALITE_API_BASE_URL`), `SINALITE_CLIENT_ID`, `SINALITE_CLIENT_SECRET`, optional `SINALITE_AUDIENCE`/`SINALITE_API_AUDIENCE`, `SINALITE_HTTP_TIMEOUT_MS`, `NEXT_PUBLIC_STORE_CODE`.
- **CDN/Storage**: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (or `R2_BUCKET_NAME`), `R2_PUBLIC_BASE_URL` (or `R2_PUBLIC_BASEURL`), `NEXT_PUBLIC_CF_ACCOUNT_HASH`, `NEXT_PUBLIC_IMAGE_DELIVERY_BASE`, `NEXT_PUBLIC_CF_IMAGE_VARIANT`.
- **Search/Redis (optional)**: `NEXT_PUBLIC_ALGOLIA_APP_ID`, `NEXT_PUBLIC_ALGOLIA_SEARCH_KEY`, `NEXT_PUBLIC_ALGOLIA_INDEX_NAME`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- **Admin/PII**: `ADMIN_EMAILS`, `ALLOW_ALL_ADMINS`, `PII_KEY`, `PHONE_ENC_KEY`.

Run `node _archive/scripts/checkEnv.mjs` to verify the essentials before starting the dev server.

## Local Development
1. **Install dependencies**: `pnpm install` (Node 18–22 supported).
2. **Set env vars**: create `.env.local` using the list above.
3. **Database**: update `drizzle.config.ts` with your local Postgres creds if needed, then run `pnpm db:push` to sync the schema or `pnpm db:generate` to create migrations.
4. **Seed / sync catalog data**:
   - Fetch SinaLite catalog, options, and pricing into Postgres with `pnpm sync:sinalite` (runs [`_archive/scripts/syncSinalite.js`](./_archive/scripts/syncSinalite.js)).
   - Cache pricing/shipping data with `pnpm cache:price` and `pnpm cache:ship` (see [`_archive/scripts/cache-price.ts`](./_archive/scripts/cache-price.ts) and [`_archive/scripts/cache-ship.ts`](./_archive/scripts/cache-ship.ts)).
   - Build static JSON used by the app with `pnpm build:data` (calls [`_archive/scripts/buildSiteData.cjs`](./_archive/scripts/buildSiteData.cjs)).
   - For a full end-to-end pull (truncates and reloads everything), use `pnpm sync:batch` or `pnpm sina:all` (see [`_archive/scripts/sina_all.sh`](./_archive/scripts/sina_all.sh)).
5. **Sync assets**:
   - Product/option asset helpers live in [`_archive/scripts`](./_archive/scripts) (e.g., `compareAssets.js`, `cleanProductAssets.js`, `update_category_assets.py`).
   - Cloudflare R2 upload helpers live beside the CDN utilities in `src/lib/r2*.ts`.
6. **Start the app**: `pnpm dev` (runs env check then `next dev`). Visit [http://localhost:3000](http://localhost:3000).

## Deployment
- The automated deploy helper (`pnpm deploy:full`) runs [`_archive/scripts/deploy.sh`](./_archive/scripts/deploy.sh): verifies a clean git tree, installs deps, generates blur placeholders for hero slides, runs lint/build, commits any generated slide data, and pushes to the target branch.
- Production builds use `pnpm build` followed by `pnpm start` on your hosting provider with the same env vars. Stripe webhooks can be tested locally with `pnpm stripe:listen` (forwards to `http://localhost:3000/api/stripe/webhook`).

## Troubleshooting
- **Missing env vars**: run `node _archive/scripts/checkEnv.mjs` to see what is absent before starting.
- **Database connection errors**: ensure `DATABASE_URL` or `drizzle.config.ts` matches your Postgres instance and that migrations were pushed (`pnpm db:push`).
- **Catalog sync issues**: confirm SinaLite credentials and network access; rerun `pnpm sync:sinalite` or the batch script to rebuild tables.
- **Asset/CDN problems**: verify Cloudflare R2 credentials and `R2_PUBLIC_BASE_URL`; rebuild placeholders with the deploy script if hero images look blank.
- **Stripe webhooks**: run `pnpm stripe:listen` to see incoming events and confirm `STRIPE_SECRET_KEY` is set.

## Key Paths
- App routes: `src/app`
- Database schema & migrations: `src/db/schema`, `src/db/migrations`
- Core libraries: `src/lib`
- Static data & tables: `data/`, `table_data/`
- Deployment & data helpers: `_archive/scripts`
