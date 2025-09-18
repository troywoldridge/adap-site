// src/lib/stripe.ts
import Stripe from "stripe";

/**
 * Keep Stripe client creation dead-simple so Next's server bundler
 * never chokes on top-level ESM exports. Single default export only.
 */

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

/**
 * Allow STRIPE_API_VERSION like "2025-07-30" or "2025-07-30.basil".
 * We strip any qualifier (".basil") because stripe-node expects a pure date.
 */
const RAW = (process.env.STRIPE_API_VERSION ?? "").trim();
let version: Stripe.LatestApiVersion | undefined = undefined;

if (RAW) {
  const date = RAW.split(".")[0]; // "2025-07-30.basil" -> "2025-07-30"
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    version = date as Stripe.LatestApiVersion;
    if (date !== RAW) {
      // Reduce noisy logs; keep a single gentle note in dev
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[stripe] STRIPE_API_VERSION "${RAW}" includes a qualifier; using "${date}" instead.`
        );
      }
    }
  }
}

// Build config safely (avoid unknown options like "betas")
const cfg: Stripe.StripeConfig = {};
if (version) cfg.apiVersion = version;

// Single default export — no named export!
const stripe = new Stripe(key, cfg);
export default stripe;
