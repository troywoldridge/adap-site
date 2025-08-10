// app/api/orders/[id]/reorder/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { orderSessions } from "@/db/schema";
import { enforceRateLimit } from "@/lib/rateLimit";
import { auth } from "@clerk/nextjs/server";
import { createOrderSession, setOrderSessionCookie } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ParamsSchema = z.object({ id: z.string().uuid() });

async function requireUserId() {
  const { userId } = await auth();            // ✅ await auth()
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await enforceRateLimit(req);
  if (limited) {
    return limited;
  }

  try {
    const userId = await requireUserId();
    const { id } = ParamsSchema.parse(params);

    // 1) Fetch original order
    const rows = await db
      .select()
      .from(orderSessions)
      .where(and(eq(orderSessions.id, id), eq(orderSessions.userId, userId)))
      .limit(1);

    const original = rows[0];
    if (!original) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2) Create a new session cloning critical fields
    const cloned = await createOrderSession({
      userId,
      productId: original.productId,
      options: original.options ?? [],
      files: original.files ?? [],
      shippingInfo: undefined,            // ✅ use undefined (not null)
      billingInfo: undefined,             // ✅ use undefined (not null)
      currency: original.currency ?? "USD",
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      selectedShippingRate: undefined,    // ✅ use undefined (not null)
      notes: original.notes ?? null,      // null is fine if createOrderSession allows it
    });

    // 3) Set cookie
    await setOrderSessionCookie(cloned.id);

    // 4) Redirect to product page
    const url = new URL(`/products/${encodeURIComponent(cloned.productId)}`, req.url);
    url.searchParams.set("from", "reorder");
    return NextResponse.redirect(url.toString(), { status: 303 });
  } catch (err: any) {
    if (err?.issues) {
      return NextResponse.json({ error: "Invalid request", details: err.issues }, { status: 422 });
    }
    const msg = err?.message || "Reorder failed";
    const status = /Unauthorized/.test(msg) ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export async function PUT() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export async function DELETE() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
