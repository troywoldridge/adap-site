import { sendEmail } from "@/lib/sendEmail";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { to, orderId } = await req.json();
  const subject = `Order Confirmation #${orderId}`;
  const html = `<h1>Thank you for your order!</h1><p>Your order <b>#${orderId}</b> has been received.</p>`;

  try {
    await sendEmail({ to, subject, html });
    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
  }
}
