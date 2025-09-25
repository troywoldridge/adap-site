import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { stripe } from "@/lib/stripe";
import { finalizePaidOrderFromCartRef } from "@/lib/orderFinalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id") || "";
    const sid = (await cookies()).get("sid")?.value ?? "";

    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "missing_session_id" }, { status: 400 });
    }

    // Verify with Stripe and pick up metadata
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
    const piId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent as any)?.id ?? null;

    const cartId = (session.metadata?.cart_id as string) ?? null;
    const metaSid = (session.metadata?.sid as string) ?? sid ?? null;

    // Idempotent finalize (same as webhook)
    await finalizePaidOrderFromCartRef({ piId, cartId, sid: metaSid, sessionId });

    // rotate SID so the cart page shows empty/new cart
    const freshSid = crypto.randomUUID();
    const res = NextResponse.json({ ok: true, redirect: "/account" }, { status: 200 });
    res.cookies.set("sid", freshSid, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
    res.cookies.set("adap_sid", freshSid, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "finalize_failed" }, { status: 500 });
  }
}
