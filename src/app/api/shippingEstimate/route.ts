// app/api/shippingEstimate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getShippingEstimate } from "@/lib/getShippingEstimate";
import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";
import { enforceRateLimit } from "@/lib/rateLimit";

// Avoid caching at the framework level
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const FileSchema = z.object({
  type: z.string().optional().default("front"),
  url: z.string().url(),
});

const OrderItemSchema = z.object({
  productId: z.union([z.string(), z.number()]),
  // Regular products: array of option IDs; roll labels may use an object
  options: z.union([
    z.array(z.union([z.string(), z.number()])),
    z.record(z.any()),
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
  ShipMethod: z.string().optional(), // not needed for estimate
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

const ShippingEstimateBodySchema = z.object({
  orderData: z.object({
    items: z.array(OrderItemSchema).min(1, "At least one item is required"),
    shippingInfo: ShippingInfoSchema,
    billingInfo: BillingInfoSchema,
    notes: z.string().optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    // 1) Parse & validate request body
    const json = await req.json();
    const { orderData } = ShippingEstimateBodySchema.parse(json);

    // 2) Get Sinalite access token securely on the server
    const accessToken = await getSinaliteAccessToken();

    // 3) Call Sinalite shipping estimate (POST /order/shippingEstimate)
    const methods = await getShippingEstimate(orderData, accessToken);

    // 4) Return normalized list of methods
    return NextResponse.json(methods, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    // Zod validation errors
    if (err?.issues) {
      return NextResponse.json(
        { error: "Invalid request", details: err.issues },
        { status: 422 }
      );
    }

    console.error("[shippingEstimate] error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch shipping estimate" },
      { status: 400 }
    );
  }
}

// Reject non-POST methods explicitly (optional; helpful during testing)
export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export async function PUT() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
