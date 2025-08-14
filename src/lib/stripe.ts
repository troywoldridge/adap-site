import Stripe from "stripe";

/**
 * Required env:
 *  - STRIPE_SECRET_KEY           (use sk_test_... for sandbox)
 *  - STRIPE_API_VERSION          (e.g. "2025-07-30" — date only)
 */

const rawKey = process.env.STRIPE_SECRET_KEY;
if (!rawKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const rawVersion =
  process.env.STRIPE_API_VERSION ||
  "2025-07-30"; // default to your desired version (date only)

// If someone sets "2025-07-30.basil", keep only the date.
const apiVersionDateOnly = rawVersion.split(".")[0];

// Type union in @types/stripe may lag new dates; cast safely:
export const stripe = new Stripe(rawKey, {
  apiVersion: apiVersionDateOnly as unknown as Stripe.StripeConfig["apiVersion"],
});

// Safety guard: don’t allow live keys in dev.
const isTestKey = rawKey.startsWith("sk_test_");
if (process.env.NODE_ENV !== "production" && !isTestKey) {
  throw new Error("Refusing to start dev server with a LIVE Stripe key.");
}
if (process.env.NODE_ENV === "production" && isTestKey) {
  console.warn("⚠️ Running production with a TEST Stripe key.");
}
