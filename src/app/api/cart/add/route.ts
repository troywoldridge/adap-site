// src/app/api/cart/add/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getOrEnsureSid } from "@/lib/getOrSetSid";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return res;
}

function setSidCookies(res: NextResponse, sid: string) {
  const common = {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  };
  // Keep both names in sync for legacy readers
  res.cookies.set("adap_sid", sid, common);
  res.cookies.set("sid", sid, common);
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    productId,
    quantity = 1,
    optionIds = [],
    // price, // not part of cartLines schema right now
  } = body as {
    productId: number;
    quantity?: number;
    optionIds?: number[];
    price?: number;
  };

  // Create a response FIRST so we can set cookies on it (Next 15 pattern)
  let res = NextResponse.json({ ok: true });

  // Ensure we have a SID; if we mint one, set it on the response
  const sid = await getOrEnsureSid({ res });
  // Also set the legacy cookie name so all routes read the same SID
  setSidCookies(res, sid);

  // Find or create an open cart for this SID
  let cart = await db.query.carts.findFirst({
    where: and(eq(carts.sid, sid), eq(carts.status, "open")),
  });

  if (!cart) {
    [cart] = await db.insert(carts).values({ sid, status: "open" }).returning();
  }

  // Insert the line using only columns defined in your schema
  await db.insert(cartLines).values({
    cartId: cart.id,
    productId: Number(productId),
    quantity: Number(quantity),
    optionIds: optionIds as any, // jsonb[] in schema
    artwork: null,
  });

  return noStore(res);
}
