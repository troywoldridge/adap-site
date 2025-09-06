import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/db/schema/orders";
import { cartLines } from "@/db/schema/cartLines";
import { cartArtwork } from "@/db/schema/cartArtwork";

function moneyFmt(cents: number, currency: "USD" | "CAD") {
  const dollars = (Number(cents) || 0) / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(dollars);
}
function niceDate(s?: string | null) {
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" :
    d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export async function buildInvoicePdfForOrder(orderId: string): Promise<{ buffer: Buffer; filename: string }> {
  const [o] = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)) ?? [];
  if (!o) throw new Error("Order not found");

  const lines = await db
    .select({
      id: cartLines.id,
      productId: cartLines.productId,
      quantity: cartLines.quantity,
      unitPriceCents: cartLines.unitPriceCents,
      lineTotalCents: cartLines.lineTotalCents,
    })
    .from(cartLines)
    .where(eq(cartLines.cartId, o.cartId as string));

  // @ts-ignore
  const PDFDocument = (await import("pdfkit")).default as any;
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  const chunks: Buffer[] = [];
  const stream = doc as NodeJS.ReadableStream;
  const done: Promise<Buffer> = new Promise((resolve) => {
    stream.on("data", (c: Buffer) => chunks.push(Buffer.from(c)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const APP_NAME = process.env.APP_NAME || "Adap Print";
  const COMPANY_ADDR = process.env.APP_COMPANY_ADDRESS || "123 Main St, City, ST";
  const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@example.com";
  const currency = (o.currency === "CAD" ? "CAD" : "USD") as "USD" | "CAD";

  const subtotal = Number(o.subtotalCents) || 0;
  const ship = Number(o.shippingCents) || 0;
  const tax = Number(o.taxCents) || 0;
  const credits = Number((o as any).creditsCents || 0);
  const total = Number(o.totalCents) || 0;

  doc.fontSize(18).text(`${APP_NAME} — Invoice`);
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#555").text(COMPANY_ADDR);
  doc.text(`Support: ${SUPPORT_EMAIL}`);
  doc.moveDown();

  const invNo = o.orderNumber ? `#${o.orderNumber}` : `#${o.id.slice(0, 8)}`;
  doc.fillColor("#000").fontSize(12).text(`Invoice ${invNo}`);
  doc.fontSize(10).fillColor("#555").text(`Date: ${niceDate(o.placedAt ?? o.createdAt)}`);
  doc.moveDown();

  const labelX = 400, valX = 520, right = 560;

  // Items table (simple)
  doc.moveDown().fillColor("#000").fontSize(11).text("Items", { underline: true });
  doc.moveDown(0.5);
  for (const l of lines) {
    const qty = Number(l.quantity ?? 0);
    const unit = Number(l.unitPriceCents ?? 0);
    const lineTotal = Number.isFinite(Number(l.lineTotalCents)) ? Number(l.lineTotalCents) : qty * unit;
    doc.fontSize(10).fillColor("#000").text(`Product ${String(l.productId)} x ${qty} — ${moneyFmt(unit, currency)}`);
    doc.fillColor("#000").text(moneyFmt(lineTotal, currency), { align: "right" });
    doc.moveDown(0.2);
  }

  doc.moveDown(0.6);
  doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
  doc.moveDown(0.4);

  doc.fontSize(10).fillColor("#555").text("Subtotal", labelX, doc.y, { width: 100, align: "right" });
  doc.fillColor("#000").text(moneyFmt(subtotal, currency), valX, doc.y, { width: right - valX, align: "right" });

  doc.fillColor("#555").text("Shipping", labelX, doc.y, { width: 100, align: "right" });
  doc.fillColor("#000").text(moneyFmt(ship, currency), valX, doc.y, { width: right - valX, align: "right" });

  doc.fillColor("#555").text("Tax", labelX, doc.y, { width: 100, align: "right" });
  doc.fillColor("#000").text(moneyFmt(tax, currency), valX, doc.y, { width: right - valX, align: "right" });

  if (credits > 0) {
    doc.fillColor("#0a7").text("Loyalty credit", labelX, doc.y, { width: 100, align: "right" });
    doc.fillColor("#0a7").text(`−${moneyFmt(credits, currency)}`, valX, doc.y, { width: right - valX, align: "right" });
  }

  doc.moveDown(0.3);
  doc.moveTo(400, doc.y).lineTo(right, doc.y).stroke();
  doc.moveDown(0.3);
  doc.fontSize(12).fillColor("#000").text("Total", labelX, doc.y, { width: 100, align: "right" });
  doc.fontSize(12).text(moneyFmt(total, currency), valX, doc.y, { width: right - valX, align: "right" });

  doc.end();

  const buffer = await done;
  const filename = `Invoice_${o.orderNumber || o.id}.pdf`;
  return { buffer, filename };
}
