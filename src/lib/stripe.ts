import Stripe from "stripe";

/**
 * Required env:
 *  - STRIPE_SECRET_KEY           (use sk_test_... in dev)
 *  - STRIPE_API_VERSION          (e.g. "2025-07-30.basil" or "2025-07-30")
 */

const rawKey = process.env.STRIPE_SECRET_KEY;
if (!rawKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

// Accept either "2025-07-30.basil" or "2025-07-30" in env.
// At runtime Stripe expects the DATE only; the “.basil” suffix is for TS typings.
const rawVersion = process.env.STRIPE_API_VERSION || "2025-07-30.basil";
const apiVersionDateOnly = rawVersion.split(".")[0];

// Cast to the SDK’s version type (unblocks unions like “...basil”)
// Runtime gets the date-only header which Stripe expects.
export const stripe = new Stripe(rawKey, {
  apiVersion: apiVersionDateOnly as unknown as Stripe.LatestApiVersion,
});

// Safety guard: don’t allow live keys in dev.
const isTestKey = rawKey.startsWith("sk_test_");
if (process.env.NODE_ENV !== "production" && !isTestKey) {
  throw new Error("Refusing to start dev server with a LIVE Stripe key.");
}
if (process.env.NODE_ENV === "production" && isTestKey) {
  // eslint-disable-next-line no-console
  console.warn("⚠️ Running production with a TEST Stripe key.");
}

export default stripe;
