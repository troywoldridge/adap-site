// app/api/order/place/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { enforceRateLimit } from "@/lib/rateLimit";
import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";

// Sinalite base URL: use live or sandbox via env
const BASE = process.env.SINALITE_BASE_URL || "https://liveapi.sinalite.com";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---------- Auth helpers ----------
async function requireUser() {
  const { userId } = await auth(); // <-- FIXED: must await
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return (await currentUser())!;
}

async function requireAdmin() {
  const user = await requireUser();
  const role = (user.publicMetadata?.role as string) || "user";
  if (role !== "admin") {
    throw new Error("Forbidden");
  }
  return user;
}

// ---------- Zod Schemas (matches Sinalite docs) ----------
const FileSchema = z.object({
  type: z.string().optional().default("front"),
  url: z.string().url(),
});

const ItemSchema = z.object({
  productId: z.union([z.string(), z.number()]),
  options: z.union([
  z.array(z.union([z.string(), z.number()])),
  z.record(z.string(), z.unknown()), // key type, value type
]),

  files: z.array(FileSchema).optional().default([]),
  extra: z.string().optional(),
});

const ShippingInfoSchema = z.object({
  ShipFName: z.string().min(1),
  ShipLName: z.string().min(1),
  ShipEmail: z.string().email(),
  ShipAddr: z.string().min(1),
  ShipAddr2: z.string().optional().default(""),
  ShipCity: z.string().min(1),
  ShipState: z.string().min(1),
  ShipZip: z.string().min(1),
  ShipCountry: z.string().min(2),
  ShipPhone: z.string().min(7),
  ShipMethod: z.string().min(1),
});

const BillingInfoSchema = z.object({
  BillFName: z.string().min(1),
  BillLName: z.string().min(1),
  BillEmail: z.string().email(),
  BillAddr: z.string().min(1),
  BillAddr2: z.string().optional().default(""),
  BillCity: z.string().min(1),
  BillState: z.string().min(1),
  BillZip: z.string().min(1),
  BillCountry: z.string().min(2),
  BillPhone: z.string().min(7),
});

const PlaceOrderBodySchema = z.object({
  items: z.array(ItemSchema).min(1, "At least one item is required"),
  shippingInfo: ShippingInfoSchema,
  billingInfo: BillingInfoSchema,
  notes: z.string().optional(),
  orderSessionId: z.string().uuid().optional(),
});

// ---------- POST: Place Order ----------
export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req);
  if (limited) {
    return limited;
  }

  try {
    await requireUser();

    const json = await req.json();
    const payload = PlaceOrderBodySchema.parse(json);

    const token = await getSinaliteAccessToken();

    const res = await fetch(`${BASE}/order/new`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Sinalite order failed: ${res.status} ${res.statusText}`, details: txt || undefined },
        { status: 502 }
      );
    }

    const placed = await res.json();
    return NextResponse.json(placed, { status: 200 });
  } catch (err: any) {
    if (err?.issues) {
      return NextResponse.json({ error: "Invalid request", details: err.issues }, { status: 422 });
    }
    const msg = err?.message || "Order placement failed";
    const status = /Unauthorized|Forbidden/.test(msg) ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

// ---------- GET: Dev Ping Sinalite ----------
export async function GET() {
  try {
    await requireAdmin(); // Only admins can run ping

    const token = await getSinaliteAccessToken();

    // Use a safe, non-order endpoint — replace with a real one from Sinalite's docs
    const pingRes = await fetch(`${BASE}/products`, {
      headers: { Authorization: token },
    });

    const txt = await pingRes.text();
    return NextResponse.json({
      ok: pingRes.ok,
      status: pingRes.status,
      statusText: pingRes.statusText,
      body: txt.slice(0, 500), // trim to avoid massive payloads
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Ping failed" }, { status: 500 });
  }
}

export async function PUT() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
