// src/lib/stripe.ts
import Stripe from "stripe";

/**
 * Use STRIPE_SECRET_KEY for live/dev. Optionally set STRIPE_API_VERSION
 * (e.g. "2024-06-20"). If not set, Stripe will use your account default.
 */
const key =
  process.env.STRIPE_SECRET_KEY ||
  process.env.STRIPE_API_KEY; // fallback if you used a different name

if (!key) {
  throw new Error(
    "Missing STRIPE_SECRET_KEY (or STRIPE_API_KEY). Set it in your env before starting the server."
  );
}

// If you provide a version, it must be YYYY-MM-DD. Otherwise leave undefined.
const apiVersion = (process.env.STRIPE_API_VERSION ??
  undefined) as Stripe.StripeConfig["apiVersion"];

export const stripe = new Stripe(key, {
  apiVersion,            // ✅ allowed
  maxNetworkRetries: 2,  // ✅ allowed
  timeout: 60_000,       // ✅ allowed
  appInfo: {             // ✅ allowed (shows in Stripe logs)
    name: "ADAP",
    version: "1.0.0",
  },
  // ❌ DO NOT pass "betas" or any unsupported keys here.
});

export type { Stripe };
