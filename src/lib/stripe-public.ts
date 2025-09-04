// src/lib/stripe-public.ts
import { loadStripe } from "@stripe/stripe-js";

export const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
if (!STRIPE_PK && process.env.NODE_ENV !== "production") {
  console.warn("[stripe] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing");
}

export const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : Promise.resolve(null);
