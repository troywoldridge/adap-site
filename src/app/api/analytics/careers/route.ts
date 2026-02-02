// src/app/api/analytics/careers/route.ts
import "server-only";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CareerEventPayload = {
  event?: string; // e.g. "view", "submit"
  path?: string;
  ref?: string;
  meta?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as CareerEventPayload;

  // Minimal normalization
  const event = String(body.event ?? "event").slice(0, 64);
  const path = String(body.path ?? "").slice(0, 512);
  const ref = String(body.ref ?? "").slice(0, 512);

  // Safe: do not require DB here (prevents env issues from killing analytics)
  // Later you can wire this into careerEvents table once columns are confirmed.
  console.log("[analytics/careers]", { event, path, ref });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  // Simple ping
  return NextResponse.json({ ok: true });
}
