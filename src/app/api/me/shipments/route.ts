// src/app/api/me/shipments/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { orders } from "@/db/schema/orders";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Shipment = {
  carrier: string;
  trackingNumber: string;
  status: string;
  eta?: string | null;
  events?: { time: string; description: string; location?: string }[];
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "missing_orderId" }, { status: 400 });
    }

    const { userId } = await auth();
    const jar = await cookies();
    const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? null;

    const [o] = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)) ?? [];
    if (!o) return NextResponse.json({ ok: false, shipments: [] });

    // Claim guest → user if possible
    if (userId && o.userId === sid) {
      await db.update(orders).set({ userId }).where(eq(orders.id, orderId));
      (o as any).userId = userId;
    }
    if (![userId, sid].filter(Boolean).includes(o.userId)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // 🔗 TODO: Wire to your SinaLite proxy per the SinaLite API documentation.
    // Example shape:
    // const res = await fetch(`${process.env.INTERNAL_API_BASE}/sinalite/orders/${o.providerId}/shipments`, { headers: {...} });
    // const data = await res.json();
    // Transform to Shipment[] and return.

    // For now, return a friendly fake if none available:
    const shipments: Shipment[] = o.provider === "sinalite"
      ? [
          {
            carrier: "UPS",
            trackingNumber: "1Z999AA10123456784",
            status: "In transit",
            eta: new Date(Date.now() + 3 * 86400e3).toLocaleDateString(),
            events: [
              { time: new Date(Date.now() - 86400e3).toISOString(), description: "Departed facility", location: "Mississauga, ON" },
              { time: new Date(Date.now() - 2 * 86400e3).toISOString(), description: "Label created", location: "Toronto, ON" },
            ],
          },
        ]
      : [];

    return NextResponse.json({ ok: true, shipments });
  } catch (e: any) {
    console.error("/api/me/shipments failed", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
