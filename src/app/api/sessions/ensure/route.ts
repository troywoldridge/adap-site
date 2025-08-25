// src/app/api/session/ensure/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return res;
}

async function getJar() {
  const maybe = cookies() as any;
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

export async function POST(_req: NextRequest) {
  let res = NextResponse.json({ ok: true });

  try {
    const jar = await getJar();
    let sid = jar.get?.("adap_sid")?.value ?? jar.get?.("sid")?.value;

    if (!sid) {
      sid = crypto.randomUUID();
      // Set both cookie names so legacy/new code paths stay in sync
      res.cookies.set("adap_sid", sid, COOKIE_OPTS);
      res.cookies.set("sid", sid, COOKIE_OPTS);
    } else {
      // refresh/align cookies
      res.cookies.set("adap_sid", sid, COOKIE_OPTS);
      res.cookies.set("sid", sid, COOKIE_OPTS);
    }

    // (Optional but helpful) ensure there’s an OPEN cart bound to this sid
    const open = await db.query.carts.findFirst({
      where: and(eq(carts.sid, sid), eq(carts.status, "open")),
    });
    if (!open) {
      await db.insert(carts).values({
        sid,
        status: "open",
        currency: "USD", // default; your add-to-cart will overwrite if CA
      });
    }

    res = NextResponse.json({ ok: true, sid }, { headers: res.headers });
    return noStore(res);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
