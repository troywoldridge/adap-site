// src/app/api/sessions/route.ts
import { NextResponse } from "next/server";
import {
  getOrderSessionIdFromCookie,
  getOrderSessionById,
  createOrderSession,
  setOrderSessionCookie,
} from "@/lib/session";

export async function GET() {
  const id = await getOrderSessionIdFromCookie();
  if (!id) return NextResponse.json({ ok: true, session: null });
  const session = await getOrderSessionById(id);
  return NextResponse.json({ ok: true, session: session ?? null });
}

export async function POST(req: Request) {
  const existingId = await getOrderSessionIdFromCookie();
  if (existingId) {
    const existing = await getOrderSessionById(existingId);
    if (existing) return NextResponse.json({ ok: true, session: existing, from: "cookie" });
  }

  const body = await req.json().catch(() => ({} as any));
  const productId = String(body?.productId ?? "");

  const session = await createOrderSession({
    productId,
    options: [],
    files: [],
    currency: "USD",
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
  });

  await setOrderSessionCookie(session.id);
  return NextResponse.json({ ok: true, session, from: "created" });
}
