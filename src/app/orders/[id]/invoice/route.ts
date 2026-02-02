// src/app/orders/[id]/invoice/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/* Runtime / caching                                                           */
/* -------------------------------------------------------------------------- */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* -------------------------------------------------------------------------- */
/* Helpers: money, headers, minimal PDF                                        */
/* -------------------------------------------------------------------------- */
function money(cents: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents || 0) / 100);
}

function makePdfHeadersFromBuffer(orderId: string, buf: Buffer) {
  const etag = crypto.createHash("sha1").update(buf).digest("hex");
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="invoice-${orderId}.pdf"`,
    "Cache-Control": "private, no-store",
    ETag: `W/"${etag}"`,
  };
}

/** Tiny, dependency-free single-page PDF (Helvetica 12pt). */
function makeMinimalInvoicePdf(params: {
  orderId: string;
  createdAtISO?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  currency?: string;
  items: { name: string; qty: number; unitCents: number; lineCents: number }[];
  subtotalCents: number;
  shippingCents?: number;
  taxCents?: number;
  creditsCents?: number;
  totalCents: number;
}): Buffer {
  const {
    orderId,
    createdAtISO,
    customerName,
    customerEmail,
    billingAddress,
    shippingAddress,
    currency = "USD",
    items,
    subtotalCents,
    shippingCents = 0,
    taxCents = 0,
    creditsCents = 0,
    totalCents,
  } = params;

  const lines: string[] = [];
  lines.push("AMERICAN DESIGN AND PRINTING");
  lines.push(`Invoice # ${orderId}`);
  if (createdAtISO) lines.push(`Date: ${new Date(createdAtISO).toLocaleString()}`);
  lines.push("");

  if (customerName || customerEmail || billingAddress) {
    lines.push("Bill To:");
    if (customerName) lines.push(customerName);
    if (customerEmail) lines.push(customerEmail);
    if (billingAddress) lines.push(...billingAddress.split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
    lines.push("");
  }

  if (shippingAddress) {
    lines.push("Ship To:");
    lines.push(...shippingAddress.split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
    lines.push("");
  }

  lines.push("Items");
  lines.push("------------------------------------------------------------");
  for (const it of items) {
    lines.push(`${it.qty} × ${it.name}`);
    lines.push(`   ${money(it.lineCents, currency)}`);
  }
  lines.push("------------------------------------------------------------");
  lines.push(`Subtotal: ${money(subtotalCents, currency)}`);
  if (shippingCents) lines.push(`Shipping: ${money(shippingCents, currency)}`);
  if (taxCents) lines.push(`Tax: ${money(taxCents, currency)}`);
  if (creditsCents) lines.push(`Credits: -${money(creditsCents, currency)}`);
  lines.push(`Total: ${money(totalCents, currency)}`);

  const startX = 50, startY = 750, leading = 16;
  const esc = (s: string) => s.replace(/([()\\])/g, "\\$1");
  let content = "BT\n/F1 12 Tf\n";
  content += `${startX} ${startY} Td\n0 -1 Td\n`;
  for (const line of lines) content += `(${esc(line)}) Tj\n0 -${leading} Td\n`;
  content += "ET";
  const contentLen = Buffer.byteLength(content, "utf8");

  const header = "%PDF-1.4\n%âãÏÓ\n";
  const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  const obj3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n";
  const obj4 = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
  const obj5 = `5 0 obj\n<< /Length ${contentLen} >>\nstream\n${content}\nendstream\nendobj\n`;
  const body = obj1 + obj2 + obj3 + obj4 + obj5;

  // Offsets for xref
  const headerLen = Buffer.byteLength(header, "utf8");
  const o1 = headerLen;
  const o2 = o1 + Buffer.byteLength(obj1, "utf8");
  const o3 = o2 + Buffer.byteLength(obj2, "utf8");
  const o4 = o3 + Buffer.byteLength(obj3, "utf8");
  const o5 = o4 + Buffer.byteLength(obj4, "utf8");
  const xrefStart = o5 + Buffer.byteLength(obj5, "utf8");

  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (const off of [o1, o2, o3, o4, o5]) {
    xref += `${off.toString().padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.concat([Buffer.from(header), Buffer.from(body), Buffer.from(xref), Buffer.from(trailer)]);
}

/* -------------------------------------------------------------------------- */
/* Introspection helpers (Postgres)                                            */
/* -------------------------------------------------------------------------- */
async function tableExists(name: string) {
  const q = sql`SELECT to_regclass(${`public.${name}`}) AS t`;
  const res = await db.execute(q);
  const row = Array.isArray(res) ? (res as any)[0] : (res as any).rows?.[0];
  return !!(row?.t ?? row?.to_regclass);
}

async function columnExists(table: string, column: string) {
  const q = sql`
    SELECT EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
    ) AS e
  `;
  const res = await db.execute(q);
  const row = Array.isArray(res) ? (res as any)[0] : (res as any).rows?.[0];
  return !!row?.e;
}

async function firstExistingColumn(table: string, candidates: string[]) {
  for (const c of candidates) if (await columnExists(table, c)) return c;
  return null;
}

/* -------------------------------------------------------------------------- */
/* Flexible loaders: orders + items (order_items or cart_lines fallback)       */
/* -------------------------------------------------------------------------- */
type LoadedOrder = {
  id: string;
  createdAtISO?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  currency?: string | null;
  subtotalCents?: number;
  shippingCents?: number;
  taxCents?: number;
  creditsCents?: number;
  totalCents?: number;
};

type LoadedItem = { name: string; qty: number; unitCents: number; lineCents: number };

async function loadOrder(orderId: string): Promise<LoadedOrder | null> {
  if (!(await tableExists("orders"))) return null;

  const cols: Record<string, string | null> = {
    id: await firstExistingColumn("orders", ["id"]),
    createdAt: await firstExistingColumn("orders", ["created_at", "createdAt", "createdat"]),
    customerName: await firstExistingColumn("orders", ["customer_name", "customerName"]),
    customerEmail: await firstExistingColumn("orders", ["customer_email", "customerEmail"]),
    billingAddress: await firstExistingColumn("orders", ["billing_address", "billingAddress"]),
    shippingAddress: await firstExistingColumn("orders", ["shipping_address", "shippingAddress"]),
    currency: await firstExistingColumn("orders", ["currency"]),
    subtotalCents: await firstExistingColumn("orders", ["subtotal_cents", "subtotalCents"]),
    shippingCents: await firstExistingColumn("orders", ["shipping_cents", "shippingCents"]),
    taxCents: await firstExistingColumn("orders", ["tax_cents", "taxCents"]),
    creditsCents: await firstExistingColumn("orders", ["credits_cents", "creditsCents"]),
    totalCents: await firstExistingColumn("orders", ["total_cents", "totalCents"]),
  };
  if (!cols.id) return null;

  const select = sql`
    SELECT
      ${sql.raw(`"${cols.id}"`)}::text AS id,
      ${cols.createdAt ? sql.raw(`"${cols.createdAt}"`) : sql.raw(`NULL`)} AS created_at,
      ${cols.customerName ? sql.raw(`"${cols.customerName}"`) : sql.raw(`NULL`)} AS customer_name,
      ${cols.customerEmail ? sql.raw(`"${cols.customerEmail}"`) : sql.raw(`NULL`)} AS customer_email,
      ${cols.billingAddress ? sql.raw(`"${cols.billingAddress}"`) : sql.raw(`NULL`)} AS billing_address,
      ${cols.shippingAddress ? sql.raw(`"${cols.shippingAddress}"`) : sql.raw(`NULL`)} AS shipping_address,
      ${cols.currency ? sql.raw(`"${cols.currency}"`) : sql.raw(`NULL`)} AS currency,
      ${cols.subtotalCents ? sql.raw(`"${cols.subtotalCents}"`) : sql.raw(`0`)} AS subtotal_cents,
      ${cols.shippingCents ? sql.raw(`"${cols.shippingCents}"`) : sql.raw(`0`)} AS shipping_cents,
      ${cols.taxCents ? sql.raw(`"${cols.taxCents}"`) : sql.raw(`0`)} AS tax_cents,
      ${cols.creditsCents ? sql.raw(`"${cols.creditsCents}"`) : sql.raw(`0`)} AS credits_cents,
      ${cols.totalCents ? sql.raw(`"${cols.totalCents}"`) : sql.raw(`0`)} AS total_cents
    FROM "orders"
    WHERE ${sql.raw(`"${cols.id}"`)}::text = ${orderId}
    LIMIT 1
  `;

  const res = await db.execute(select);
  const row = Array.isArray(res) ? (res as any)[0] : (res as any).rows?.[0];
  if (!row) return null;

  return {
    id: String(row.id),
    createdAtISO: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    customerName: row.customer_name ?? null,
    customerEmail: row.customer_email ?? null,
    billingAddress: row.billing_address ?? null,
    shippingAddress: row.shipping_address ?? null,
    currency: row.currency ?? "USD",
    subtotalCents: Number(row.subtotal_cents || 0),
    shippingCents: Number(row.shipping_cents || 0),
    taxCents: Number(row.tax_cents || 0),
    creditsCents: Number(row.credits_cents || 0),
    totalCents: Number(row.total_cents || 0),
  };
}

async function loadItems(orderId: string): Promise<LoadedItem[]> {
  // Prefer order_items
  if (await tableExists("order_items")) {
    const nameCol = (await firstExistingColumn("order_items", ["name", "title"])) ?? "name";
    const qtyCol = (await firstExistingColumn("order_items", ["quantity", "qty"])) ?? "quantity";
    const unitCol =
      (await firstExistingColumn("order_items", ["unit_price_cents", "unitPriceCents"])) ?? "unit_price_cents";
    const lineCol =
      (await firstExistingColumn("order_items", ["line_total_cents", "lineTotalCents"])) ?? "line_total_cents";
    const orderIdCol = (await firstExistingColumn("order_items", ["order_id", "orderId"])) ?? "order_id";

    const q = sql`
      SELECT
        ${sql.raw(`"${nameCol}"`)} AS name,
        ${sql.raw(`"${qtyCol}"`)} AS qty,
        ${sql.raw(`"${unitCol}"`)} AS unit_cents,
        ${sql.raw(`"${lineCol}"`)} AS line_cents
      FROM "order_items"
      WHERE ${sql.raw(`"${orderIdCol}"`)}::text = ${orderId}
      ORDER BY 1
    `;
    const res = await db.execute(q);
    const rows: any[] = Array.isArray(res) ? (res as any) : (res as any).rows ?? [];
    return rows.map((r) => ({
      name: String(r.name ?? "Item"),
      qty: Number(r.qty ?? 0),
      unitCents: Number(r.unit_cents ?? 0),
      lineCents: Number(r.line_cents ?? (Number(r.qty ?? 0) * Number(r.unit_cents ?? 0))),
    }));
  }

  // Fallback: cart_lines having order_id
  if (await tableExists("cart_lines")) {
    const orderIdCol = (await firstExistingColumn("cart_lines", ["order_id", "orderId"])) ?? null;
    if (orderIdCol) {
      const nameCol = (await firstExistingColumn("cart_lines", ["name", "title", "product_name"])) ?? "name";
      const qtyCol = (await firstExistingColumn("cart_lines", ["quantity", "qty"])) ?? "quantity";
      const unitCol =
        (await firstExistingColumn("cart_lines", ["unit_price_cents", "unitPriceCents", "price_cents"])) ??
        "unit_price_cents";
      const lineCol =
        (await firstExistingColumn("cart_lines", ["line_total_cents", "lineTotalCents", "total_cents"])) ??
        "line_total_cents";

      const q = sql`
        SELECT
          ${sql.raw(`"${nameCol}"`)} AS name,
          ${sql.raw(`"${qtyCol}"`)} AS qty,
          ${sql.raw(`"${unitCol}"`)} AS unit_cents,
          ${sql.raw(`"${lineCol}"`)} AS line_cents
        FROM "cart_lines"
        WHERE ${sql.raw(`"${orderIdCol}"`)}::text = ${orderId}
        ORDER BY 1
      `;
      const res = await db.execute(q);
      const rows: any[] = Array.isArray(res) ? (res as any) : (res as any).rows ?? [];
      return rows.map((r) => ({
        name: String(r.name ?? "Item"),
        qty: Number(r.qty ?? 0),
        unitCents: Number(r.unit_cents ?? 0),
        lineCents: Number(r.line_cents ?? (Number(r.qty ?? 0) * Number(r.unit_cents ?? 0))),
      }));
    }
  }

  return [];
}

/* -------------------------------------------------------------------------- */
/* Route handlers                                                              */
/* -------------------------------------------------------------------------- */
type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const orderId = `${params?.id || ""}`.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Missing order id." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const order = await loadOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const items = await loadItems(orderId);

  // Robust totals
  const subtotal = order.subtotalCents ?? items.reduce((s, it) => s + (it.lineCents || 0), 0);
  const shipping = order.shippingCents ?? 0;
  const tax = order.taxCents ?? 0;
  const credits = order.creditsCents ?? 0;
  const total = order.totalCents ?? Math.max(0, subtotal + shipping + tax - credits);

  // Build PDF (Buffer)
  const pdfBuffer = makeMinimalInvoicePdf({
    orderId,
    createdAtISO: order.createdAtISO,
    customerName: order.customerName ?? null,
    customerEmail: order.customerEmail ?? null,
    billingAddress: order.billingAddress ?? null,
    shippingAddress: order.shippingAddress ?? null,
    currency: order.currency || "USD",
    items,
    subtotalCents: subtotal,
    shippingCents: shipping,
    taxCents: tax,
    creditsCents: credits,
    totalCents: total,
  });

  // ✅ Buffer -> real ArrayBuffer (copy), then hand ArrayBuffer to NextResponse
  const ab = new ArrayBuffer(pdfBuffer.byteLength);
  new Uint8Array(ab).set(pdfBuffer); // copy Buffer bytes into the ArrayBuffer

  return new NextResponse(ab, {
    status: 200,
    headers: makePdfHeadersFromBuffer(orderId, pdfBuffer),
  });
}

export async function HEAD(_req: NextRequest, { params }: Params) {
  const orderId = `${params?.id || ""}`.trim();
  if (!orderId) return new NextResponse(null, { status: 400 });

  const order = await loadOrder(orderId);
  if (!order) return new NextResponse(null, { status: 404 });

  // Tiny empty PDF just for ETag calc
  const empty = makeMinimalInvoicePdf({
    orderId,
    createdAtISO: order.createdAtISO,
    customerName: null,
    customerEmail: null,
    billingAddress: null,
    shippingAddress: null,
    currency: order.currency || "USD",
    items: [],
    subtotalCents: 0,
    shippingCents: 0,
    taxCents: 0,
    creditsCents: 0,
    totalCents: 0,
  });

  const ab = new ArrayBuffer(empty.byteLength);
  new Uint8Array(ab).set(empty);

  return new NextResponse(null, {
    status: 200,
    headers: makePdfHeadersFromBuffer(orderId, empty),
  });
}
