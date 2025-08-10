// app/api/shippingEstimate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getShippingEstimate } from "@/lib/getShippingEstimate";
import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";
import { enforceRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const FileSchema = z.object({
  type: z.string().optional().default("front"),
  url: z.string().url(),
});

const OrderItemSchema = z.object({
  productId: z.union([z.string(), z.number()]),
  options: z.union([
    z.array(z.union([z.string(), z.number()])),
    // pass BOTH key & value types so TS doesn't pick the wrong overload
    z.record(z.string(), z.unknown()),
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
  ShipMethod: z.string().optional(),
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

// Normalize object-shaped options to a flat array of values
function normalizeOptions(
  opts: (string | number)[] | Record<string, unknown>
): (string | number)[] {
  if (Array.isArray(opts)) {
    return opts;
  }
  return Object.values(opts) as (string | number)[];
}

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req);
  if (limited) {
    return limited;
  }

  try {
    const json = await req.json();
    const { orderData } = ShippingEstimateBodySchema.parse(json);

    const accessToken = await getSinaliteAccessToken();

    // Build request in the exact shape the Sinalite client expects (structural typing)
    const request = {
      items: orderData.items.map((i) => ({
        productId: i.productId,
        options: normalizeOptions(i.options),
        files: i.files ?? [],
        ...(i.extra ? { extra: i.extra } : {}),
      })),
      shippingInfo: orderData.shippingInfo,
      billingInfo: orderData.billingInfo,
      ...(orderData.notes ? { notes: orderData.notes } : {}),
    };

    // Call helper with exactly two arguments (request, token)
    const methods = await getShippingEstimate(request as any, accessToken as string);

    return NextResponse.json(methods, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
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

export async function GET()  { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export async function PUT()  { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export async function DELETE(){ return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
