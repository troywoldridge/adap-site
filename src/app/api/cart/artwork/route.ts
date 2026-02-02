// src/app/api/cart/artwork/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { carts } from "@/lib/db/schema/cart";
import { cartLines } from "@/lib/db/schema/cartLines";
import { cartAttachments } from "@/lib/db/schema/cartAttachments";
import { cfUrl } from "@/lib/cdn"; // <- make sure this returns a Cloudflare Images URL for a given key/id

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return res;
}

function safeFileName(input?: string | null, fallbackKey?: string): string {
  const s = (input ?? "").trim();
  if (s) return s;
  // try basename from key (handles "folder/abc.png" or a bare id)
  const base = (fallbackKey ?? "").split("/").pop() ?? "";
  return base || "artwork";
}

function ensureUrlFromKey(key: string): string {
  // Prefer CDN URL; if cfUrl returns empty, fall back to the key (last resort).
  return cfUrl(key) ?? key;
}

/**
 * GET /api/cart/artwork?lineId=... | ?cartId=...
 * Returns { ok, attachments: [{ id, storageId, url, fileName }] }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lineId = searchParams.get("lineId") ?? undefined;
    const cartId = searchParams.get("cartId") ?? undefined;

    if (!lineId && !cartId) {
      return NextResponse.json({ ok: false, error: "Provide lineId or cartId" }, { status: 400 });
    }

    let rows: Array<{
      id: string;
      cartId: string | null;
      lineId: string | null;
      key: string;
      url: string;
      fileName: string;
      createdAt: Date | null;
    }> = [];

    if (lineId) {
      rows = await db
        .select()
        .from(cartAttachments)
        .where(eq(cartAttachments.lineId, lineId))
        .orderBy(desc(cartAttachments.createdAt));
    } else {
      // by cartId: gather lineIds then fetch attachments for them
      const lineRows = await db
        .select({ id: cartLines.id })
        .from(cartLines)
        .where(eq(cartLines.cartId, cartId!));

      const lineIds = lineRows.map((r) => r.id);
      if (lineIds.length === 0) {
        return noStore(NextResponse.json({ ok: true, attachments: [] }));
      }

      rows = await db
        .select()
        .from(cartAttachments)
        .where(inArray(cartAttachments.lineId, lineIds))
        .orderBy(desc(cartAttachments.createdAt));
    }

    const attachments = rows.map((r) => ({
      id: r.id,
      storageId: r.key,
      url: r.url || ensureUrlFromKey(r.key),
      fileName: r.fileName,
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
 *
 * - Validates line + open cart
 * - Inserts REQUIRED columns for your schema:
 *   cartId, lineId, productId, fileName, key, url, createdAt, updatedAt
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      lineId?: string;
      storageId?: string;
      fileName?: string;
    };

    const lineId = (body.lineId ?? "").trim();
    const storageId = (body.storageId ?? "").trim();
    if (!lineId || !storageId) {
      return NextResponse.json(
        { ok: false, error: "lineId and storageId are required" },
        { status: 400 },
      );
    }

    // Resolve line & cart
    const line = await db.query.cartLines.findFirst({ where: eq(cartLines.id, lineId) });
    if (!line) {
      return NextResponse.json({ ok: false, error: "Cart line not found" }, { status: 404 });
    }

    const cart = await db.query.carts.findFirst({
      where: and(eq(carts.id, line.cartId), eq(carts.status, "open")),
    });
    if (!cart) {
      return NextResponse.json({ ok: false, error: "Cart is not open or not found" }, { status: 409 });
    }

    // Build required fields
    const now = new Date();
    const url = ensureUrlFromKey(storageId);
    const fileName = safeFileName(body.fileName, storageId);

    // Use strong typing to satisfy Drizzle insert shape
    const values: typeof cartAttachments.$inferInsert = {
      cartId: cart.id,
      lineId: lineId,
      productId: line.productId,      // <- comes from the cart line
      fileName,
      key: storageId,
      url,                            // <- non-null string
      createdAt: now,
      updatedAt: now,
    };

    const [row] = await db
      .insert(cartAttachments)
      .values(values)
      .returning({ id: cartAttachments.id });

    return noStore(
      NextResponse.json({
        ok: true,
        attachment: { id: row.id, storageId, url, fileName },
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
