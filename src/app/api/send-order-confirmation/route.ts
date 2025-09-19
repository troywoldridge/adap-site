// src/app/api/send-order-confirmation/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/sendEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// simple helper for safe error messages
function errMsg(e: unknown, fallback = "Unexpected error") {
  return e instanceof Error ? (e.message || fallback) : fallback;
}

const BodySchema = z.object({
  to: z.string().email(),
  orderId: z.string().min(1).or(z.number()).transform(String),
});

export async function POST(req: NextRequest) {
  try {
    // validate JSON body
    const json = await req.json().catch(() => ({}));
    const { to, orderId } = BodySchema.parse(json);

    const subject = `Order Confirmation #${orderId}`;
    const html = `
      <h1>Thank you for your order!</h1>
      <p>Your order <b>#${orderId}</b> has been received.</p>
    `;

    await sendEmail({ to, subject, html });

    return NextResponse.json({ status: "success" });
  } catch (e: unknown) {
    // zod validation errors → 422, others → 500
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json(
        { status: "error", error: "Invalid request", details: (e as any).issues },
        { status: 422 }
      );
    }

    console.error("send-order-confirmation failed:", e);
    return NextResponse.json(
      { status: "error", error: errMsg(e) },
      { status: 500 }
    );
  }
}

// Optional method guards for clarity (Next will 405 by default if not exported)
export async function GET() {
  return NextResponse.json({ status: "error", error: "Method Not Allowed" }, { status: 405 });
}
export const PUT = GET;
export const DELETE = GET;
