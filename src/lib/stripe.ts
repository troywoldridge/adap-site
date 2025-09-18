// src/lib/stripe.ts
import Stripe from "stripe";

/**
 * Server-side Stripe SDK instance.
 * ⚠️ Use only in Node.js runtimes (Next.js route handlers with runtime="nodejs").
 *
 * Env:
 *   - STRIPE_SECRET_KEY  (required)
 *   - STRIPE_API_VERSION (optional, e.g. "2024-06-20"; falls back to Stripe account default)
 */
const key =
  process.env.STRIPE_SECRET_KEY ||
  process.env.STRIPE_API_KEY; // optional fallback

if (!key) {
  throw new Error(
    "Missing STRIPE_SECRET_KEY (or STRIPE_API_KEY). Set it in your env before starting the server."
  );
}

// If provided, must be YYYY-MM-DD; otherwise leave undefined to use account default.
const apiVersion = (process.env.STRIPE_API_VERSION ??
  undefined) as Stripe.StripeConfig["apiVersion"];

export const stripe = new Stripe(key, {
  apiVersion,
  maxNetworkRetries: 2,
  timeout: 60_000,
  appInfo: {
    name: "ADAP",
    version: "1.0.0",
  },
});

export type { Stripe };

// ✅ Compatibility shim: allow both default and named imports
export default stripe;
