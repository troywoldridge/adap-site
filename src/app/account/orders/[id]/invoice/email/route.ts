import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

import { db } from "@/lib/db";
import { orders } from "@/db/schema/orders";

// same pdf assembly you use in /api/orders/[id]/invoice:
import { buildInvoicePdfForOrder } from "./shared"; // <— see helper below

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = process.env.INVOICES_FROM_EMAIL || "invoices@example.com";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    const jar = await cookies();
    const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? null;

    const [o] = (await db.select().from(orders).where(eq(orders.id, params.id)).limit(1)) ?? [];
    if (!o) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // ownership / claim guest
    if (userId && o.userId === sid) {
      await db.update(orders).set({ userId }).where(eq(orders.id, params.id));
      (o as any).userId = userId;
    }
    if (![userId, sid].filter(Boolean).includes(o.userId)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // your email target (Clerk primary email); fallback to metadata on order if you store it
    const toEmail = process.env.DEBUG_INVOICE_TARGET || (await getUserPrimaryEmail(userId)) || "";
    if (!toEmail) return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });

    // build the PDF buffer (reuse your existing code path)
    const { buffer, filename } = await buildInvoicePdfForOrder(o.id);

    const resend = new Resend(RESEND_API_KEY);
    const APP_NAME = process.env.APP_NAME || "Adap Print";

    await resend.emails.send({
      from: FROM_EMAIL,
      to: [toEmail],
      subject: `${APP_NAME} Invoice ${o.orderNumber ? `#${o.orderNumber}` : `#${o.id.slice(0, 8)}`}`,
      html: `<p>Hi! Your invoice is attached as a PDF.</p>
             <p>You can also view it online: <a href="${process.env.PUBLIC_APP_ORIGIN}/account/orders/${o.id}/invoice">invoice link</a></p>`,
      attachments: [
        {
          filename,
          content: buffer.toString("base64"),
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
  const { clerkClient } = await import("@clerk/nextjs/server");
  const u = await clerkClient.users.getUser(userId);
  return u?.primaryEmailAddress?.emailAddress || u?.emailAddresses?.[0]?.emailAddress || null;
}
