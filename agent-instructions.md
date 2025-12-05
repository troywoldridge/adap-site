
---

## 2️⃣ `agent-instructions.md` (refactor-focused)

**Path:** `/agent-instructions.md`

```md
# agent-instructions.md – AI-Powered Refactor Guidelines

This document provides **specific instructions for AI-powered code refactors** in the ADAP projects, especially `adap-site` and `legendary-collectibles`.

It assumes the broader permissions and context defined in `agent.md`, and narrows behavior to **how refactors should be proposed and executed**.

---

## 1. Refactor Goals

When refactoring code, your primary goals are:

1. **Preserve behavior** – The user-visible and API-visible behavior must not change unless explicitly requested.
2. **Improve clarity** – Make code easier to read, understand, and maintain.
3. **Improve safety** – Reduce bugs, edge-case failures, and security risks.
4. **Improve performance** – Only when safe and measurable.
5. **Improve test coverage** – Add or enhance tests to cover current and new behavior.

Refactors should be **incremental and focused**, not arbitrary large rewrites.

---

## 2. General Refactor Rules

When performing refactors:

- Keep public APIs stable unless asked to change them.
- Maintain type safety and avoid introducing `any` without justification.
- Maintain or improve test coverage (Vitest and/or Playwright).
- Maintain existing auth rules, guards, and middleware behavior.
- Use the **same libraries and patterns** already present in the repo (no random new stacks).

---

## 3. Process for Refactor Requests

When Troy requests a refactor (e.g. “clean up this route file” or “simplify this component”):

1. **Summarize current behavior**
   - Briefly explain what the current code does.
   - Identify any obvious problems (duplication, tight coupling, fragile logic, poor naming).

2. **State the refactor intent**
   - Example: “Separate data fetching from rendering”, “Split into smaller components”, “Extract option pricing logic to a shared utility”.

3. **Describe the proposed changes**
   - Which files will be modified.
   - What new functions, components, or modules will be introduced.
   - Any new tests that will be added.

4. **Apply the refactor**
   - Provide full updated file contents for the changed files when requested.
   - Keep changes within the described scope.

5. **Verify behavior**
   - Mention how to run relevant tests:
     - `pnpm test` / `pnpm test:run`
     - `pnpm test:e2e`
   - Describe what the tests cover and how they validate the refactor.

---

## 4. Specific Refactor Patterns

### 4.1 React Components (Next.js / Client UI)

When refactoring components:

- Prefer small, focused components.
- Use clear, descriptive prop names.
- Avoid unnecessary client-side state if server components or server actions can handle it.
- Extract repeated bits of JSX into reusable components where appropriate.
- Keep accessibility in mind:
  - Use semantic HTML.
  - Use proper ARIA attributes where needed.
  - Avoid breaking keyboard navigation.

If you see large “god” components (e.g., a single 500-line product page):

- Propose splitting into:
  - A top-level layout/wrapper.
  - Subcomponents for:
    - Price display.
    - Option selectors.
    - Artwork upload.
    - Cart / CTA box.

### 4.2 API Routes (Next.js Route Handlers)

When refactoring API handlers:

- Normalize input validation (prefer zod or a shared validator).
- Extract repeat logic (auth checks, error handling) into helper functions or libs where appropriate.
- Keep handlers small: parse input, call a usecase/service, return a response.
- Avoid deeply nested logic; prefer early returns for errors.

If you see complex business logic inside route files:

- Propose and implement extraction into `src/lib/**` service functions.
- Add unit tests for those service functions.

### 4.3 Database Access & Drizzle

When refactoring DB-related code:

- Remove raw SQL duplication where possible.
- Use typed Drizzle queries, with explicit selects and constraints.
- Keep migrations consistent and sequential.
- Avoid modifying existing migrations; add new ones.

If logic mixes HTTP concerns and DB queries heavily:

- Extract DB logic into reusable functions in `src/lib/db/**` or similar.

### 4.4 Config, Env, and Utilities

When refactoring configs or utility modules:

- Avoid breaking environment variable names.
- Provide clear, central configuration helpers (e.g., `getEnv()` functions that throw if important env variables are missing).
- Remove unused or dead code where safe and obvious.

---

## 5. Test Integration

Every meaningful refactor should:

- Maintain or improve unit test coverage for the affected logic.
- Add or update E2E tests if behavior in critical flows (cart, checkout, account, admin) is changed.

Use the existing testing conventions:

- Vitest tests:
  - `src/**/__tests__/*.test.ts`
  - or `src/**.test.ts` (depending on repo).
- Playwright tests:
  - `tests/*.spec.ts`, with tags such as `@cart`, `@checkout`, `@category`, `@subcategory`, `@admin`, `@a11y`.

When you add new tests:

- Describe which behavior they protect.
- Show how Troy can run just those tests (e.g., `pnpm test:e2e -- --grep "@cart"`).

---

## 6. Performance & Optimization Refactors

When performance issues are suspected:

- Look for N+1 queries, heavy loops, repeated network calls.
- Propose data-level optimizations (e.g., batching, caching, indexing).
- Avoid micro-optimizations that harm readability.
- Use memoization/hooks sparingly and only where they reduce real work.

If you’re suggesting a significant performance refactor:

- Explain the likely gains.
- Highlight potential tradeoffs (complexity, new dependencies).

---

## 7. Large or Risky Refactors

If Troy hints at a large refactor (e.g., “I want to clean up all checkout logic”):

- Start with a clear plan:
  - Outline target structure.
  - Phase changes into smaller PR-sized units.
- Propose an order of operations:
  1. Introduce new abstractions (without yet removing old).
  2. Migrate consumers gradually.
  3. Remove deprecated code once all usage is moved.
- Never propose “all-or-nothing” refactors where a partial state is broken.

---

## 8. Communication & Style for Refactors

When answering refactor-related prompts:

- Keep the tone casual, collaborative, and forward-looking.
- Be concrete and code-focused.
- Prefer “Here’s the exact file content you should use” over “Change X to Y in this diff”.
- Explain high-level intent, but don’t over-theorize.

Example answer structure for a refactor:

1. Short explanation of what’s wrong with the current code.
2. High-level overview of the new structure.
3. Full updated code for each affected file.
4. Notes on any new tests/migrations/configs.
5. Commands to run to validate (`pnpm test`, `pnpm test:e2e -- --grep "@category"`, etc.).

---

## 9. Scope of Refactor Authority

For refactor work, you **may**:

- Rename functions, variables, and files for clarity.
- Reorganize modules and imports.
- Extract new shared components/hooks/services.
- Clean up `TODO`s or incomplete implementations, if you can infer the intent.
- Delete clearly dead and unused code.

You **should not**:

- Change public APIs or behavior without explicitly stating so.
- Remove features unless those features are clearly deprecated and unused.
- Introduce new major dependencies unless requested or clearly beneficial.

---

## 10. Final Notes

Your job as a refactor-focused agent is to behave like a **very careful senior engineer**:

- Improve the codebase continuously.
- Preserve stability and behavior.
- Provide clear explanations and migration paths.
- Keep Troy’s mental load low by being explicit, thorough, and predictable.
