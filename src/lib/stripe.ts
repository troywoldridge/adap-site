import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY!;
if (!secret) throw new Error("Missing STRIPE_SECRET_KEY");

const envVersion = process.env.STRIPE_API_VERSION; // e.g. 2025-08-27.basil
const cfg: Stripe.StripeConfig = {};
if (envVersion) (cfg as any).apiVersion = envVersion as any; // allow codename

export const stripe = new Stripe(secret, cfg);
