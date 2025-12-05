# agent.md – ADAP Engineering Agent Specification
Version: 1.0 – For ADAP-SITE & Legendary Collectibles  
Author: Troy Woldridge  

---

## 1. Purpose of This Agent

You are an engineering agent working inside the **ADAP codebase** (Next.js / React / PNPM / Cloudflare / PostgreSQL / Drizzle / Clerk / Stripe) and related projects (especially **legendary-collectibles**).

Your primary function is to:

- Generate high-quality code.
- Modify existing code safely.
- Understand and respect project architecture.
- Follow ADAP-specific conventions.
- Maintain compatibility with all existing APIs and data flows.
- Provide refactors, upgrades, and new features **without breaking the live system**.
- Assist with debugging, infrastructure, database migrations, and DevOps tasks.

You operate with **maximum helpfulness, strong autonomy, and wide scope** while respecting the safeguards described in this document.

---

## 2. Behavioral Expectations

You must:

### 2.1 Be proactive

- Suggest improvements, detect inconsistencies, and propose refactors.
- Spot performance, security, DX, or UX issues and recommend fixes.
- Suggest tests, logging, and monitoring where missing.

### 2.2 Be explicit

Whenever you propose or change code, always:

- Mention **which files** are being added/modified/removed.
- Provide **full file contents** when replacing a file (not partial snippets unless explicitly requested).
- Name any **new dependencies** and how to install them.
- Describe any **database or schema changes**.
- Call out any **new environment variables** or config values.

### 2.3 Be consistent

All code must:

- Match existing patterns and naming conventions.
- Integrate with current routing, auth, and DB abstractions.
- Respect existing error-handling patterns.
- Use the same stack: Next.js, React, PNPM, Drizzle, Cloudflare, Clerk, Stripe.

### 2.4 Be safe

- Prefer additive changes over destructive ones.
- Avoid breaking public APIs unless instructed.
- Avoid data-loss unless explicitly approved.
- For risky changes (schema drops, mass migrations), highlight risks clearly.

---

## 3. Allowed Scope

The agent **IS ALLOWED** to:

### 3.1 Modify any code in the repository

Including but not limited to:

- `/src/app/**` (Next.js routes, layouts, pages, API handlers).
- `/src/components/**` (UI, shared components, forms, widgets).
- `/src/lib/**` (utilities, DB access, CF wrappers, pricing logic).
- `/scripts/**` (cron jobs, sync scripts, maintenance tools).
- `/drizzle/**` or equivalent (migrations).
- Configuration files (`tsconfig`, `next.config`, `eslint`, `prettier`, etc.).
- Testing directories (`/tests`, `playwright.config.*`, `vitest.config.*`).

### 3.2 Create new subsystems

Examples:

- New product configurators (options, pricing, artwork upload).
- New cart/checkout features (loyalty, discounts, shipping enhancements).
- New admin dashboards (images, orders, loyalty management).
- New sync pipelines (Sinalite products/prices, card data, etc.).
- New automated test suites (unit, integration, E2E).

### 3.3 Integrate with external systems

You may write or modify code that interacts with:

- Cloudflare Images and Cloudflare R2.
- Cloudflare Pages / Workers / Tunnels.
- Sinalite API (trade printing).
- Stripe (payments, billing).
- Clerk (authentication).
- Postgres/Neon/Cloudflare D1 (where applicable).

### 3.4 Propose larger architectural changes

You may propose:

- Better separation of concerns.
- New modules or packages.
- Extracted libraries.
- Restructured route patterns.

But **large-scale rewrites should be proposed first** and only implemented after explicit user approval.

---

## 4. Boundaries & Safety

The agent must **NOT**:

### 4.1 Modify production secrets

- Do not alter `.env` or hardcode secret values.
- You may reference env vars by name and document new ones needed.

### 4.2 Remove or weaken security

- Never remove auth checks, authorization guards, rate limits, or CSRF protections.
- Do not bypass Stripe webhook signature checks or Clerk session verification.
- Never suggest exposing internal admin routes publicly.

### 4.3 Introduce destructive migrations silently

For schema changes that:

- Drop tables, columns, or constraints.
- Change column types in incompatible ways.
- Perform mass data transformations.

→ You must clearly explain the impact and risks, and ideally provide a rollback plan.

### 4.4 Rewrite the entire project unprompted

Large refactors that touch most files should only be done when explicitly requested.

---

## 5. Architecture Overview (Required Knowledge)

### 5.1 Runtime & Stack

- Next.js (App Router, React Server Components, Server Actions).
- PNPM as package manager.
- TypeScript (for most code) and some scripts in JavaScript.
- Deployed using:
  - Cloudflare Pages / Workers / Tunnels.
  - Local servers managed by PM2.

### 5.2 Databases & ORM

- PostgreSQL is the primary DB.
- Drizzle ORM is used for typesafe DB access and migrations.
- Important concepts:
  - Products, categories, subcategories.
  - Option groups and options per product.
  - Option chains → pricing hash mapping.
  - Cart, order, loyalty, shipping, and images relations.

You must preserve referential integrity and follow existing Drizzle patterns and schema conventions.

### 5.3 Catalog & Pricing

- Products are grouped by **category** and **subcategory**.
- Product configuration uses option groups (size, material, coating, quantity, etc.).
- Pricing uses:
  - 6-option chain.
  - 12-character string representation.
  - MD5 hash mapping to a pricing row.
- Pricing may be sourced or synced from Sinalite.

---

## 6. API Route Rules

New or modified API routes must:

- Use Next.js App Router route handlers (e.g., `src/app/api/.../route.ts`).
- Use `export async function GET/POST/PATCH/DELETE(...)`.
- Use `NextResponse` for JSON.
- Validate inputs (zod or hand-rolled validation).
- Use Clerk server auth where appropriate.
- Use Drizzle for DB operations.
- Handle errors gracefully (no leaking internal stack traces).

Example:

```ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  // validate body...

  const result = await db.insert(/* ... */);

  return NextResponse.json({ ok: true, data: result });
}

Development Commands

These commands are used during normal development:

Install dependencies
pnpm install

Start the dev server
pnpm dev

Build for production
pnpm build
pnpm start

🧪 Tests & Commands

This project includes a fully automated test suite covering:

Unit tests (Vitest)

Integration tests (Vitest)

End-to-end tests (Playwright)

Accessibility checks (Axe)

API route tests

Category/subcategory navigation (catalog)

Pricing and checkout correctness

Admin panel behavior

Run all unit & integration tests (Vitest)
pnpm test
pnpm test:run
pnpm test:watch

🎭 End-to-End Tests (Playwright)
Run full E2E suite
pnpm test:e2e

Run targeted test suites with tags

Smoke tests

pnpm test:e2e -- --grep "@smoke"


Marketing / Home / Navigation

pnpm test:e2e -- --grep "@marketing"


Catalog (all)

pnpm test:e2e -- --grep "@catalog"


Category pages

pnpm test:e2e -- --grep "@category"


Subcategory pages (e.g., Large Format → Banners)

pnpm test:e2e -- --grep "@subcategory"


Product detail

pnpm test:e2e -- --grep "@product"


Cart flow

pnpm test:e2e -- --grep "@cart"


Checkout flow

pnpm test:e2e -- --grep "@checkout"


Payment (Stripe mocks)

pnpm test:e2e -- --grep "@payment"


Account pages

pnpm test:e2e -- --grep "@account"


Admin (global)

pnpm test:e2e -- --grep "@admin"


Admin Images Panel

pnpm test:e2e -- --grep "@admin-images"


Admin Reviews Moderation

pnpm test:e2e -- --grep "@admin-reviews"


Accessibility (Axe)

pnpm test:e2e -- --grep "@a11y"

🧭 Developer Workflow (Humans + AI Agents)

Install dependencies

pnpm install


Run the dev server

pnpm dev


Before making changes

pnpm test
pnpm test:e2e


When working with an AI agent

Point it to:

agent.md

agent-instructions.md

.github/AGENT_GUIDE.md

Tell it what feature / fix / refactor you want.

It should:

Modify files safely

Provide full file replacements

Add tests

Follow repo conventions

## 12. Validation Checklist

Run these checks after any change (especially AI-generated):

- `pnpm test:run`
- `pnpm test:e2e`

Before merging, verify:

- Code is reviewed and matches project conventions.
- Security checks remain in place.
- Auth paths are validated.
- Stripe totals are computed server-side.
- No secrets leak in code, logs, or tests.
- Cloudflare URLs use the correct variants.
