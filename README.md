# ADAP Site

This repository contains the ADAP storefront built on Next.js with a Postgres backend managed through Drizzle. It integrates Clerk for authentication and Stripe for payments so contributors can finish the site without digging through the codebase.

# ADAP-SITE Documentation & Engineering Guide

This repository is optimized for both **human developers** and **AI engineering agents**.  
It includes end-to-end testing tools, agent instructions, refactor rules, and architecture conventions.

Below are essential links and instructions for working inside this codebase.

---

# 🚀 AI Agent Documentation

This repo includes three agent control files:

### ▸ [`agent.md`](./agent.md)

Master specification for the ADAP Engineering Agent  
Includes:

- Allowed scope  
- Boundaries  
- Full architecture overview  
- Cloudflare / Stripe / Sinalite rules  
- Testing rules  
- Deployment rules  
- Behavior expectations  

### ▸ [`agent-instructions.md`](./agent-instructions.md)

AI refactor and code-modification guidelines.  
Includes:

- How to safely refactor  
- How to extract modules  
- How to restructure files  
- Safe-file replacement template  
- Decision matrix for refactor depth  

### ▸ [`workspace/agent-profile.json`](./workspace/agent-profile.json)

Machine-readable profile for GitHub Copilot Agents & other workspace-aware tools.

### ▸ [`/.github/AGENT_GUIDE.md`](./.github/AGENT_GUIDE.md)

High-level agent guide for all GitHub-based automation.

---

## 🧰 Development Commands

These commands are used during normal development.
   -pnpm install

## Install dependencies

```bash
pnpm install

## AI Agents & Automation

This repository is AI-agent–friendly and includes configuration for autonomous or semi-autonomous coding assistants.

- [`agent.md`](./agent.md) – Master spec for the **ADAP Engineering Agent**.  
  - Defines permissions, boundaries, architecture overview, and expectations for any agent working on this codebase.
  - Covers Next.js, Drizzle ORM, PostgreSQL, Cloudflare (Images/R2), Stripe, Clerk, and Sinalite integration (per the official Sinalite API documentation).
- [`agent-instructions.md`](./agent-instructions.md) – Focused guidelines for **AI-powered refactors**.  
  - How agents should clean up code, extract services, add tests, and restructure modules **without changing behavior** unless explicitly requested.
- [`workspace/agent-profile.json`](./workspace/agent-profile.json) – Profile for tools like GitHub Copilot Agents or other workspace-aware assistants.  
  - Declares stack, conventions, and what the agent is allowed to do (code editing, test generation, refactoring, documentation, DB design, DevOps suggestions).

If you’re using an AI assistant:

1. Point it at `agent.md` and `agent-instructions.md` first so it understands the project rules.
2. Let it read `workspace/agent-profile.json` for stack and capability hints.
3. Ask it to always:
   - Follow existing patterns and conventions.
   - Respect security and production data.
   - Add or update tests when changing core behavior.

-

## Tests & Commands

This project includes a fully automated test suite covering:

- Unit tests (Vitest)
- Integration tests (Vitest)
- End-to-end tests (Playwright)
- Accessibility checks (Axe)
- API route tests
- Category/subcategory navigation (catalog)
- Pricing and checkout correctness
- Admin panel behavior

### Install Dependencies

```bash
pnpm install

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
- Deployment & data helpers: `_archive/scripts`.

## Database

 pnpm db:push 
 pnpm db:generate

## Seed / sync catalog data

### Fetch SinaLite catalog/options/pricing into Postgres

 pnpm sync:sinalite

### Cache pricing & shipping

pnpm cache:price
pnpm cache:ship

### Build static JSON used by the app

Build static JSON used by the app

### Full end-to-end reload (truncate + reload everything)

pnpm sync:batch
# or
pnpm sina:all

### Sync assets

Product/option asset helpers live under /scripts

### Start the dev server

pnpm dev 
Visit: http://localhost:3002

## Deployment

### Automated deploy helper

pnpm deploy:full

Runs /scripts/deploy.sh:

Verifies a clean git tree

Installs deps

Generates blur placeholders for hero slides

Runs lint + build

Commits any generated slide data

Pushes to the target branch

### Production build

pnpm build
pnpm start


## Stripe webhooks (local)

pnpm stripe:listen


Forwards to: http://localhost:3000/api/stripe/webhook.

## Troubleshooting

### Missing env vars

node /scripts/checkEnv.mjs


### Database connection errors

Check DATABASE_URL and drizzle.config.ts.

Ensure migrations were pushed: pnpm db:push.

### Catalog sync issues

Confirm SinaLite credentials and network access.

Rerun pnpm sync:sinalite or pnpm sina:all.

### Asset/CDN problems

Verify Cloudflare R2 credentials and R2_PUBLIC_BASE_URL.

Rebuild placeholders via deploy script if hero images look blank.

### Stripe webhooks

Use pnpm stripe:listen and confirm STRIPE_SECRET_KEY is valid.

## Key Paths

App routes: src/app

DB schema & migrations: src/db/schema, src/db/migrations

Core libraries: src/lib

Static data & tables: data/, table_data/

Scripts: /scripts




