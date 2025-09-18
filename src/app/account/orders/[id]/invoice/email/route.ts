// src/app/account/orders/[id]/invoice/email/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { auth, clerkClient as _clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

import { db } from "@/lib/db";
import { orders } from "@/db/schema/orders";
// same PDF assembly you use in /api/orders/[id]/invoice:
import { buildInvoicePdfForOrder } from "./shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = process.env.INVOICES_FROM_EMAIL || "invoices@example.com";
const APP_NAME = process.env.APP_NAME || "Adap Print";
const PUBLIC_APP_ORIGIN = process.env.PUBLIC_APP_ORIGIN || "https://adapnow.com";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    const jar = await cookies();
    const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? null;

    const [o] =
      (await db.select().from(orders).where(eq(orders.id, params.id)).limit(1)) ?? [];
    if (!o) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // Claim guest order if the logged-in user owns the guest SID
    if (userId && o.userId === sid) {
      await db.update(orders).set({ userId }).where(eq(orders.id, params.id));
      (o as any).userId = userId;
    }

    // Only the logged-in owner or the current guest SID can email this invoice
    if (![userId, sid].filter(Boolean).includes(o.userId)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // Determine recipient
    const fallbackEmail =
      (o as any)?.email || (o as any)?.customerEmail || ""; // if you store email on the order
    const toEmail =
      process.env.DEBUG_INVOICE_TARGET ||
      (await getUserPrimaryEmail(userId)) ||
      fallbackEmail;

    if (!toEmail) {
      return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });
    }

    // Build the PDF
    const { buffer, filename } = await buildInvoicePdfForOrder(o.id);

    // Send email via Resend
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_EMAIL,
      to: [toEmail],
      subject: `${APP_NAME} Invoice ${
        o.orderNumber ? `#${o.orderNumber}` : `#${String(o.id).slice(0, 8)}`
      }`,
      html: `<p>Hi! Your invoice is attached as a PDF.</p>
             <p>View online: <a href="${PUBLIC_APP_ORIGIN}/account/orders/${o.id}/invoice">invoice link</a></p>`,
      attachments: [
        {
          filename,
          content: buffer.toString("base64"),
          contentType: "application/pdf",
        },
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("email invoice failed", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

async function getUserPrimaryEmail(userId?: string | null) {
  if (!userId) return null;
  const cc = typeof _clerkClient === "function" ? await _clerkClient() : _clerkClient;
  try {
    const u = await cc.users.getUser(userId);
    return (
      u?.primaryEmailAddress?.emailAddress ??
      u?.emailAddresses?.[0]?.emailAddress ??
      null
    );
  } catch {
    return null;
  }
}
