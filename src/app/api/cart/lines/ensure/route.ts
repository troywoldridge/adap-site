// src/app/api/cart/lines/ensure/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return res;
}

// Support Next 14 (sync) & Next 15 (async) cookies()
async function getJar() {
  const jarOrPromise = cookies() as any;
  return typeof jarOrPromise?.then === "function" ? await jarOrPromise : jarOrPromise;
}

function setSidCookies(res: NextResponse, sid: string) {
  const common = {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };
  // Set BOTH names for full compatibility with old code
  res.cookies.set("adap_sid", sid, common);
  res.cookies.set("sid", sid, common);
}

function sameArray(a: number[] = [], b: number[] = []) {
  if (a.length !== b.length) {
    return false;
    }
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) {
    return false;
    }
  return true;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId, quantity = 1, optionIds = [] } = body as {
      productId: number;
      quantity?: number;
      optionIds?: number[];
    };

    // Build a response so we can attach Set-Cookie if needed
    let res = NextResponse.json({ ok: true });

    // Read (or mint) SID
    const jar = await getJar();
    let sid: string | undefined = jar.get?.("adap_sid")?.value ?? jar.get?.("sid")?.value;
    if (!sid) {
      sid = crypto.randomUUID();
      setSidCookies(res, sid);
    }

    // Find or create open cart
    let cart = await db.query.carts.findFirst({
      where: and(eq(carts.sid, sid), eq(carts.status, "open")),
    });

    if (!cart) {
      [cart] = await db.insert(carts).values({ sid, status: "open" }).returning();
      // Ensure cookies set if we just created cart for a new SID
      setSidCookies(res, sid);
    }

    // Upsert line: if same productId + optionIds exists, bump quantity; else insert
    const existingLines = await db
      .select()
      .from(cartLines)
      .where(and(eq(cartLines.cartId, cart.id), eq(cartLines.productId, productId)));

    const match = existingLines.find((l: any) => sameArray(l.optionIds ?? [], optionIds));

    if (match) {
      await db
        .update(cartLines)
        .set({ quantity: Number(match.quantity ?? 0) + Number(quantity ?? 1) })
        .where(eq(cartLines.id, match.id));
    } else {
      await db.insert(cartLines).values({
        cartId: cart.id,
        productId: Number(productId),
        quantity: Number(quantity),
        optionIds: optionIds as any, // jsonb[] in schema
        artwork: null,
      });
    }

    // Return OK (client typically re-fetches /api/cart/current or /api/cart)
    return noStore(res);
  } catch (e: any) {
    console.error("POST /api/cart/lines/ensure failed:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
