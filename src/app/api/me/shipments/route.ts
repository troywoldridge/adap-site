// src/app/api/me/shipments/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema/orders";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Shipment = {
  carrier: string;
  trackingNumber: string;
  status: string;
  eta?: string | null;
  events?: { time: string; description: string; location?: string }[];
};

const mapShipment = (s: any): Shipment => ({
  carrier: s?.carrier ?? s?.provider ?? "Unknown",
  trackingNumber: s?.trackingNumber ?? s?.tracking_number ?? s?.tracking ?? "",
  status: s?.status ?? s?.currentStatus ?? "",
  eta: s?.eta ?? s?.estimatedDelivery ?? s?.estimated_arrival ?? null,
  events: Array.isArray(s?.events)
    ? s.events.map((e: any) => ({
        time: e?.time ?? e?.timestamp ?? e?.date ?? "",
        description: e?.description ?? e?.status ?? "",
        ...(e?.location ? { location: e.location } : {}),
      }))
    : undefined,
});

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

    const shipments: Shipment[] = [];

    if (o.provider === "sinalite" && o.providerId) {
      if (!process.env.INTERNAL_API_BASE) {
        throw new Error("Missing env: INTERNAL_API_BASE");
      }

      const upstream = await fetch(
        `${process.env.INTERNAL_API_BASE}/sinalite/orders/${encodeURIComponent(o.providerId)}/shipments`,
        {
          cache: "no-store",
          headers: {
            ...(req.headers.get("authorization")
              ? { Authorization: req.headers.get("authorization") as string }
              : {}),
            ...(req.headers.get("cookie") ? { Cookie: req.headers.get("cookie") as string } : {}),
          },
        },
      );

      if (!upstream.ok) {
        throw new Error(`failed_to_fetch_shipments:${upstream.status}`);
      }

      const payload = await upstream.json();
      const rawShipments = Array.isArray((payload as any)?.shipments)
        ? (payload as any).shipments
        : Array.isArray(payload)
          ? payload
          : [];

      shipments.push(...rawShipments.map(mapShipment));
    }

    return NextResponse.json({ ok: true, shipments });
  } catch (e: any) {
    console.error("/api/me/shipments failed", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
