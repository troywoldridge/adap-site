/**
 * install-stripe-cli.mjs
 *
 * This script is intentionally a NO-OP in CI / Cloudflare / servers.
 * It exists only so pnpm postinstall does not fail during builds.
 */

const isCI =
  process.env.CI === "true" ||
  process.env.CF_PAGES === "1" ||
  process.env.CLOUDFLARE === "true" ||
  process.env.NODE_ENV === "production";

if (isCI) {
  console.log("install-stripe-cli.mjs: skipping Stripe CLI install (CI/Cloudflare)");
  process.exit(0);
}

console.log("install-stripe-cli.mjs: no-op (Stripe CLI not auto-installed here)");
process.exit(0);
