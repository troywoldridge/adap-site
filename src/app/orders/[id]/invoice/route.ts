// app/api/orders/[id]/invoice/route.ts
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { orderSessions } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { enforceRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ParamsSchema = z.object({ id: z.string().uuid() });

async function requireUserId() {
  const { userId } = await auth(); // ✅ await
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await enforceRateLimit(req);
  if (limited) {
    return limited;
  }

  try {
    const userId = await requireUserId();
    const { id } = ParamsSchema.parse(params);

    const rows = await db
      .select()
      .from(orderSessions)
      .where(and(eq(orderSessions.id, id), eq(orderSessions.userId, userId)))
      .limit(1);

    const order = rows[0];
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Build PDF
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk)); // ✅ typed
    const done = new Promise<Buffer>((resolve) =>
      doc.on("end", () => resolve(Buffer.concat(chunks)))
    );

    const currency = String(order.currency || "USD");

    doc.fontSize(20).text("Invoice", { align: "right" });
    doc.moveDown();

    // Header
    doc
      .fontSize(12)
      .text("Custom Print Experts", { continued: true })
      .text("   •   support@adapnow.com");
    doc.text("https://adapnow.com");
    doc.moveDown();

    // Invoice to / meta
    doc
      .fontSize(12)
      .text(`Invoice #: ${order.sinaliteOrderId ?? order.id}`, { continued: true })
      .text(`   Date: ${new Date(order.createdAt as any).toLocaleDateString()}`);
    doc.moveDown();

    // Bill To / Ship To
    const ship = (order.shippingInfo as any) || {};
    const bill = (order.billingInfo as any) || {};

    doc.fontSize(12).text("Bill To:", { underline: true });
    doc.text(`${bill.BillFName ?? ""} ${bill.BillLName ?? ""}`);
    doc.text(`${bill.BillAddr ?? ""}${bill.BillAddr2 ? `, ${bill.BillAddr2}` : ""}`);
    doc.text(`${bill.BillCity ?? ""}, ${bill.BillState ?? ""} ${bill.BillZip ?? ""}`);
    doc.text(`${bill.BillCountry ?? ""}`);
    doc.moveDown();

    doc.fontSize(12).text("Ship To:", { underline: true });
    doc.text(`${ship.ShipFName ?? ""} ${ship.ShipLName ?? ""}`);
    doc.text(`${ship.ShipAddr ?? ""}${ship.ShipAddr2 ? `, ${ship.ShipAddr2}` : ""}`);
    doc.text(`${ship.ShipCity ?? ""}, ${ship.ShipState ?? ""} ${ship.ShipZip ?? ""}`);
    doc.text(`${ship.ShipCountry ?? ""}`);
    doc.moveDown();

    // Items
    doc.fontSize(12).text("Items", { underline: true });
    doc.moveDown(0.2);
    doc.text(`Product: ${order.productId}`);
    doc.text(
      `Options: ${
        Array.isArray(order.options) ? order.options.join(", ") : JSON.stringify(order.options)
      }`
    );
    doc.moveDown();

    // Totals
    const shipRate = order.selectedShippingRate as any as [string, string, number, number] | null;
    const shippingCost = shipRate?.[2] ?? 0;

    const fmt = (n: any) =>
      Number(n).toLocaleString("en-US", { style: "currency", currency });

    doc.text(`Subtotal: ${fmt(order.subtotal)}`);
    doc.text(`Shipping: ${fmt(shippingCost)}`);
    doc.text(`Tax: ${fmt(order.tax)}`);
    if (Number(order.discount) > 0) {
      doc.text(`Discount: -${fmt(order.discount)}`);
    }
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").text(`Total: ${fmt(order.total)}`);
    doc.font("Helvetica");

    doc.moveDown();
    if (order.trackingUrl) {
      doc.text(`Tracking: ${order.trackingUrl}`);
    }

    doc.end();
    const pdf = await done;

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${order.sinaliteOrderId ?? order.id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    if (err?.issues) {
      return NextResponse.json({ error: "Invalid request", details: err.issues }, { status: 422 });
    }
    const msg = err?.message || "Invoice generation failed";
    const status = /Unauthorized/.test(msg) ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export async function PUT() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
