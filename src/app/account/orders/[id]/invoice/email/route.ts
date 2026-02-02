import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { dbClient as db } from "@/lib/db";
import { orders } from "@/db/schema/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(_req: NextRequest, { params }: Params) {
  const database = db;

  const [order] = await database
    .select()
    .from(orders)
    .where(eq(orders.id, params.id))
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // TODO: send invoice email here

  return NextResponse.json({ ok: true, order });
}
