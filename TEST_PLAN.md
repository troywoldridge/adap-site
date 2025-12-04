# ADAP Site End-to-End Test Plan

This document outlines a comprehensive suite that exercises the site from marketing pages through cart, checkout, account management, and internal admin tooling. The goal is full functional coverage with repeatable automated checks plus a small number of exploratory/manual spot-checks.

## Tooling & Environments

- **Unit/Integration**: Vitest with React Testing Library for components, data helpers, and hooks. Run with `pnpm vitest` or `pnpm vitest --run` in CI.
- **API**: Supertest or fetch-based integration tests that hit Next.js route handlers directly (via Next test utilities) using mocked dependencies such as Stripe or Cloudflare.
- **E2E/UI**: Playwright (headed for debugging, headless in CI) to simulate user flows across marketing pages, catalog browsing, cart, checkout, account, and admin tools. Parallel workers per top-level area.
- **Accessibility**: Pa11y or Axe integration inside Playwright for critical templates (home, product, cart, checkout, account, admin review queue).
- **Performance/Resilience**: Playwright tracing for slow scenarios; synthetic network throttling and API failure simulations for cart and checkout.

## Data & Test Accounts

- Seed fixtures for catalog, products, and users (one US, one CA). Provide a test Stripe key pair and stub webhooks so payment tests do not reach real processors.
- Create admin credentials for Cloudflare/Stripe stubs to exercise internal tools.

## Coverage Matrix & Scenarios

The following sections describe what to automate. Each scenario should include both happy-path and failure-path assertions (validation errors, empty states, API failures) and be tagged for selective execution (e.g., `@cart`, `@checkout`, `@admin`).

### Marketing & Discovery

- **Home page hero & promos**: Verify hero renders, featured sales cards, and category links load from local catalog data, including suspense fallbacks. Cover responsive breakpoints and basic a11y landmarks.【F:src/app/page.tsx†L18-L200】
- **Navigation**: Global header/footer links, search/autocomplete (if available), and key CTAs (e.g., "Continue shopping" from the account page back to categories).【F:src/app/account/page.tsx†L12-L42】
- **Static info pages**: About, guarantees, turnaround, privacy/terms, shipping, accessibility—all should render without console errors and have consistent meta tags.

### Catalog & Product Configuration

- Category listing pages (US/CA contexts) load featured categories and pagination; product detail pages load options, price calculations, artwork upload widgets, availability indicators, and validations for required options.
- Search and filters (if implemented) return correct products and preserve selections across navigation.

### Cart & Review

- **Cart session handling**: Adding items from products, updating quantities, removing lines, empty-cart messaging, and persistence across reloads using session cookies.【F:src/app/cart/page.tsx†L36-L102】
- **Shipping estimator/review**: Validate selected rates carry through review CTA and handle unavailable/failed rate lookups.
- Currency handling (USD/CAD) and derived totals per store context.

### Checkout & Payments

- **Payment intent creation**: Server-calculated totals (subtotal + shipping + tax − loyalty) and error handling when client secrets are missing.【F:src/app/checkout/page.tsx†L34-L200】
- **Stripe elements flow**: Card entry, 3DS challenge mock, success/failure redirects, recovery from network errors, and prevention of double charges.
- **Order summary**: Totals reflect loyalty credits, shipping method, and tax; empty-cart guard path.
- **Webhook/receipt**: Test that webhook stubs move carts to closed orders and that confirmation emails or downloads trigger.

### Account & Orders

- Authenticated order history list, detail pages, downloadable assets, reorder flow back into cart, and guard rails for signed-out users (redirects/prompts).【F:src/app/account/page.tsx†L12-L42】
- Profile management (addresses, preferences) if present; verify validation and persistence.

### Reviews & User Content

- Submitting product reviews (rating, text), moderation queues, and visibility rules once approved.
- **Admin review queue**: Filters by product/rating, bulk approve/delete, inline editing, export links (CSV/JSON), and search within pending reviews.【F:src/app/admin/reviews/page.tsx†L1-L200】

### Media & Assets

- **Admin image browser**: Cloudflare Images fetch, pagination/search, error states when tokens are invalid, and rendering of variants.【F:src/app/admin/images/page.tsx†L4-L30】
- Artwork upload components on product/checkout flows: success, virus/size failures, and preview rendering.

### Loyalty, Pricing, and Shipping

- Loyalty credit application affects totals and never lets total drop below zero.【F:src/app/checkout/page.tsx†L75-L92】
- Price calculations for options/quantities; ensure correct rounding and currency formatters.
- Shipping rate selection and persistence through cart -> review -> checkout; handle missing/expired rates.

### Admin & Operations

- Auth gating for admin routes; verify unauthorized users are redirected.
- Loyalty management (credit issuance/adjustments) and analytics dashboards where present.
- Operational scripts or API endpoints used for sync tasks respond with expected schemas.

### Accessibility & Internationalization

- Keyboard navigation, focus order, ARIA labels for critical controls (cart, checkout, review moderation).
- Verify currency/date/number formatting per locale and language toggles if provided.

### Resilience & Security

- Session hijack/expired cookie handling for cart/checkout.
- Rate-limiting responses for login, search, or review submission.
- Input validation and sanitization for all forms (contact, checkout, reviews, admin edits).

## Execution Strategy

- **CI pipeline**: Unit/integration on every push; daily scheduled Playwright E2E against staging with seeded data. Capture videos/traces and upload artifacts on failure.
- **Smoke subset**: Minimal `@smoke` tag (home load, product add-to-cart, review checkout, admin login) per commit to keep runtime short.
- **Regression runs**: Full matrix before releases, including negative scenarios and browser permutations.

## Reporting

- Central test dashboard aggregating Vitest, API, and Playwright results; flaky test tracker with retry counts.
- Accessibility/performance budgets with thresholds and trend reports over time.
