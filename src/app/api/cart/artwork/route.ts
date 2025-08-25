// src/app/api/cart/artwork/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";

import { cartLines } from "@/db/schema/cartLines";
import { cartAttachments } from "@/db/schema/cartAttachments"; // has: id, cartId, lineId, key, url, createdAt
import { carts } from "@/db/schema/cart"; // for optional validation

import { cfUrl } from "@/lib/data"; // builds Cloudflare Images delivery URL from a storageId/key

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return res;
}

/**
 * GET /api/cart/artwork?lineId=... | ?cartId=...
 * Returns attachments normalized for the Review page:
 *  [{ id, storageId, url, fileName? }]
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lineId = searchParams.get("lineId") ?? undefined;
    const cartId = searchParams.get("cartId") ?? undefined;

    if (!lineId && !cartId) {
      return NextResponse.json(
        { ok: false, error: "Provide lineId or cartId" },
        { status: 400 },
      );
    }

    // Build where clause using Drizzle helpers (no strings)
    const where =
      lineId && cartId
        ? and(eq(cartAttachments.lineId, lineId), eq(cartAttachments.cartId, cartId))
        : lineId
        ? eq(cartAttachments.lineId, lineId)
        : eq(cartAttachments.cartId, cartId!);

    const rows = await db
      .select()
      .from(cartAttachments)
      .where(where)
      .orderBy(desc(cartAttachments.createdAt)); // ✅ Drizzle wants Column/SQL, not a string

    const attachments = rows.map((r) => ({
      id: r.id,
      storageId: r.key,
      url: r.url || cfUrl(r.key), // prefer stored URL; else synthesize via Cloudflare CDN
      // fileName isn't in the schema; include if you later add it
    }));

    return noStore(NextResponse.json({ ok: true, attachments }));
  } catch (err: any) {
    console.error("GET /api/cart/artwork failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

/**
 * POST /api/cart/artwork
 * body: { lineId: string, storageId: string, fileName?: string }
 * - Resolves cartId from the line
 * - Stores attachment using Cloudflare Images key and URL
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      lineId?: string;
      storageId?: string;
      fileName?: string;
    };

    const lineId = body?.lineId;
    const storageId = body?.storageId;

    if (!lineId || !storageId) {
      return NextResponse.json(
        { ok: false, error: "lineId and storageId are required" },
        { status: 400 },
      );
    }

    // Resolve the cartId from the line (and ensure the line exists)
    const line = await db.query.cartLines.findFirst({
      where: eq(cartLines.id, lineId),
    });

    if (!line) {
      return NextResponse.json(
        { ok: false, error: "Cart line not found" },
        { status: 404 },
      );
    }

    // Optional: make sure the cart is still open
    const cart = await db.query.carts.findFirst({
      where: and(eq(carts.id, line.cartId), eq(carts.status, "open")),
    });
    if (!cart) {
      return NextResponse.json(
        { ok: false, error: "Cart is not open or not found" },
        { status: 409 },
      );
    }

    const url = cfUrl(storageId); // serve via Cloudflare Images CDN (fast!)

    const [inserted] = await db
      .insert(cartAttachments)
      .values({
        cartId: cart.id,
        lineId,
        key: storageId, // store the image key / asset id
        url,            // store the resolved CDN URL (nice for direct linking)
      })
      .returning({ id: cartAttachments.id });

    return noStore(
      NextResponse.json({
        ok: true,
        attachment: { id: inserted.id, storageId, url, fileName: body.fileName ?? null },
      }),
    );
  } catch (err: any) {
    console.error("POST /api/cart/artwork failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
