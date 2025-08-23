// src/app/api/me/orders/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, customers } from "@/db/schema/customer";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Math.min(50, Number(url.searchParams.get("pageSize") ?? "20"));
  const offset = (page - 1) * pageSize;

  const [cust] = await db.select().from(customers).where(eq(customers.clerkUserId, userId)).limit(1);
  if (!cust) return NextResponse.json({ ok: true, orders: [], total: 0 });

  const list = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, cust.id))
    .orderBy(desc(orders.placedAt))
    .limit(pageSize)
    .offset(offset);

  // (Optional) fetch items per order – or lazy-load on client
  // const itemsByOrder = await db.select().from(orderItems).where(inArray(orderItems.orderId, list.map(o=>o.id)))

  const total = (await db
    .select({ count: orders.id })
    .from(orders)
    .where(eq(orders.customerId, cust.id)))[0]?.count ?? 0;

  return NextResponse.json({ ok: true, orders: list, total });
}
