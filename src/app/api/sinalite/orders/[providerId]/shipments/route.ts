import "server-only";
import { NextResponse } from "next/server";

// Align auth/headers and URL with SinaLite API docs
const SINALITE_BASE = process.env.SINALITE_BASE!;
const SINALITE_KEY = process.env.SINALITE_API_KEY!;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request, { params }: { params: { providerId: string } }) {
  try {
    const url = new URL(req.url);
    // Optional: pass-thru filters
    const q = new URLSearchParams(url.search);
    const upstream = `${SINALITE_BASE}/orders/${encodeURIComponent(params.providerId)}/shipments?${q.toString()}`;

    const res = await fetch(upstream, {
      headers: {
        "Authorization": `Bearer ${SINALITE_KEY}`,
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: data?.error || "sinalite_error" }, { status: res.status });
    }

    // Transform upstream payload → your Shipment[] shape if needed
    // (this shape matches our ShipmentTimeline UI)
    const shipments = (data?.shipments ?? []).map((s: any) => ({
      carrier: s.carrier,
      trackingNumber: s.tracking_number,
      status: s.status,
      eta: s.eta ?? null,
      events: (s.events || []).map((e: any) => ({
        time: e.time,
        description: e.description,
        location: e.location || "",
      })),
    }));

    return NextResponse.json({ ok: true, shipments });
  } catch (e: any) {
    console.error("sinalite proxy failed", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
