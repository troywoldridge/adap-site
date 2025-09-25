// src/lib/stripe.ts
import Stripe from "stripe";

/** Required secret (fail fast if missing) */
const secret =
  process.env.STRIPE_SECRET_KEY ??
  (() => {
    throw new Error("Missing STRIPE_SECRET_KEY");
  })();

/**
 * We allow the full dashboard version (e.g. "2025-08-27.basil").
 * Stripe’s types are conservative; cast once here so app code stays clean.
 */
const API_VERSION = (process.env.STRIPE_API_VERSION || "2025-08-27.basil").trim();

const cfg: Stripe.StripeConfig = {
  // @ts-expect-error Accept dashboard qualifier like ".basil"
  apiVersion: API_VERSION,
};

export const stripe = new Stripe(secret, cfg);
/** Re-export types for convenience */
export type { Stripe };
