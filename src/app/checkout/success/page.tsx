// src/app/checkout/success/page.tsx
import "server-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  // If no session, just land them on Account
  if (!session_id) {
    redirect("/account?paid=1");
  }

  // Best-effort verify the Checkout Session is paid
  const session = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ["payment_intent"],
  });

  if (session.payment_status !== "paid") {
    // If user reloaded or something odd, send them back safely
    redirect("/cart/review?canceled=1");
  }
  
  // Head to My Account (your account page will show the latest order)
  redirect("/account?paid=1");
}
