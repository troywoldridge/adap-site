# AGENT_GUIDE – How AI Agents Should Work in This Repo

Welcome! This repository is configured to work well with AI coding agents (GitHub Copilot Agents, ChatGPT-based tools, and similar assistants).

This guide explains **how agents should behave**, **what files define their rules**, and **how humans can use them safely** when collaborating on this codebase.

---

## 1. Core Agent Specs

There are three key files that define how agents should interact with this codebase:

### 1.1 `agent.md`

**Path:** [`./agent.md`](../agent.md)  

This is the **master specification** for the “ADAP Engineering Agent”.

It defines:

- The agent’s **role**:
  - Senior full-stack engineer (Next.js / React / PNPM).
  - Database + Drizzle ORM specialist (PostgreSQL).
  - Cloudflare / Stripe / Clerk / Sinalite integration helper.
  - QA + test automation assistant (Vitest + Playwright).
- The agent’s **allowed scope**:
  - Can modify any code file in the repo.
  - Can add new pages, components, APIs, scripts, and tests.
  - Can design new features and propose architecture improvements.
- The agent’s **boundaries**:
  - Must not weaken security or auth.
  - Must not hardcode secrets or modify production credentials.
  - Must not perform destructive schema migrations silently.
- The agent’s **architecture awareness**:
  - Next.js App Router, Server Components, and Server Actions.
  - Drizzle ORM schemas, migrations, and query patterns.
  - Cloudflare Images + CDN usage.
  - Sinalite API integration (following the official Sinalite documentation for products, options, and pricing).
  - Stripe payment and webhook flows.
  - Clerk authentication for /account and /admin.

Any agent operating in this repository should read and follow `agent.md` first.

---

### 1.2 `agent-instructions.md`

**Path:** [`./agent-instructions.md`](../agent-instructions.md)  

This file is a **refactor-focused** guide.

It tells agents how to:

- Perform **behavior-preserving refactors**:
  - Split large components.
  - Extract reusable hooks or services.
  - Clean up route handlers and move business logic into `src/lib/**`.
- Work on **API routes**:
  - Add input validation.
  - Improve error handling.
  - Keep handlers small and focused.
- Work on **DB and Drizzle code**:
  - Replace raw SQL with typed Drizzle queries.
  - Add new migrations instead of editing old ones.
- Integrate **tests**:
  - Maintain and expand Vitest coverage for logic and helpers.
  - Maintain and expand Playwright coverage for UI flows (marketing, catalog, cart, checkout, account, admin).
  - Use tags like `@cart`, `@checkout`, `@catalog`, `@category`, `@subcategory`, `@admin`, and `@a11y` for E2E tests.

Agents executing refactors should:

1. Summarize the current behavior.
2. Explain the intended refactor and scope.
3. Provide full, updated file contents when changing files.
4. Describe tests that confirm behavior hasn’t changed.

---

### 1.3 `workspace/agent-profile.json`

**Path:** [`./workspace/agent-profile.json`](../workspace/agent-profile.json)  

This JSON file provides metadata for tools like **GitHub Copilot Agents** or any workspace-aware automation.

It declares:

- Agent **name** and **description**.
- The technology **stack**:
  - `package_manager: "pnpm"`
  - `runtime: "nextjs_app_router"`
  - `orm: "drizzle"`
  - `database: "postgresql"`
  - `auth: "clerk"`
  - `payments: "stripe"`
  - `cdn: "cloudflare"`
  - `testing: { unit: "vitest", e2e: "playwright" }`
- The agent’s **capabilities**:
  - Code editing.
  - Test generation.
  - Refactoring.
  - Documentation.
  - Database design.
  - DevOps suggestions.
- High-level **instructions**:
  - Always follow `agent.md` and `agent-instructions.md`.
  - Always address the user as **Troy**.
  - Use a casual, collaborative, forward-thinking tone.
  - Never commit secrets.
  - Always compute Stripe totals server-side (subtotal + shipping + tax − loyalty).
  - Use Cloudflare Images and R2 correctly for media.
  - Use Sinalite API according to documentation and env-based credentials.
  - Respect port conventions (adap-site on 3000, legendary-collectibles on 3001) unless the repo explicitly says otherwise.

---

## 2. How Humans Should Use AI Agents Here

If you’re using an AI assistant (e.g., GitHub Copilot Chat, ChatGPT, or similar) with this repo:

1. **Point the agent at the spec files**
   - Ask it to read:
     - `agent.md`
     - `agent-instructions.md`
     - `workspace/agent-profile.json`
   - Then restate your request (feature, bugfix, refactor).

2. **Prefer full-file edits for critical code**
   - For complex files (checkout flows, pricing logic, Sinalite sync scripts), ask the agent:
     - “Please show the full updated file content for `src/app/checkout/page.tsx`.”
   - This makes review and git diffs easier.

3. **Always run tests after agent changes**
   - Unit/integration:
     - `pnpm test` or `pnpm test:run`
   - E2E:
     - `pnpm test:e2e`
     - or targeted: `pnpm test:e2e -- --grep "@category"` / `"@cart"` / `"@checkout"` / `"@admin"`

4. **Review changes before merge**
   - Use normal PR review processes.
   - Confirm:
     - No secrets or credentials are exposed.
     - No security checks were removed or loosened.
     - Behavior changes are intentional and documented.

---

## 3. Typical Tasks for Agents in This Repo

Some examples of safe, high-value tasks for agents here:

- Add a new product configurator UI for a new Sinalite product, including options, pricing integration (per Sinalite docs), and tests.
- Fix a bug in a Next.js API route that calculates prices or shipping.
- Refactor a large component into smaller, testable pieces.
- Add a Playwright test that verifies:
  - Category and subcategory pages load the correct products.
  - Cart and checkout flows work end-to-end.
- Improve error handling and logging for Sinalite sync scripts or Stripe webhooks.
- Add admin tools for Cloudflare Images browse/search, or for loyalty credit management.

---

## 4. Things Agents Should NOT Do

Agents in this repo must not:

- Commit `.env` files or any real secrets.
- Remove authentication from protected routes (`/account`, `/admin`, etc.).
- Disable or bypass webhook verification for Stripe or any external service.
- Drop or truncate production tables without explicit and documented intent.
- Force large, project-wide rewrites without Troy’s consent.

---

## 5. Summary

This repository is intentionally structured to work well with **AI-powered engineering agents**:

- `agent.md` → who the agent is and what it can do.
- `agent-instructions.md` → how to safely refactor and enhance the codebase.
- `workspace/agent-profile.json` → machine-readable profile for tools like Copilot Agents.

If you keep agents pointed at these documents, validate changes with the test suite, and review diffs carefully, you’ll get a ton of leverage with minimal risk. 💪
