/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema/cart";
import { cartArtwork } from "@/db/schema/cart-artwork";
import { getConfiguredPrice } from "@/lib/sinalite.client";
// ✅ SERVER-SAFE Cloudflare image id lookup (pure JSON map)
import { cfImageIdForProduct } from "@/lib/productAssets";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function getOrSetSid(): string {
  const jar = cookies();
  let sid = jar.get("sid")?.value;
  if (!sid) {
    sid = crypto.randomUUID();
    jar.set("sid", sid, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return sid;
}

function toNumberArray(u: unknown): number[] {
  if (!Array.isArray(u)) return [];
  const out: number[] = [];
  for (const v of u) {
    const n = Number(v as any);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

function toPositiveInt(u: unknown, fallback = 1): number {
  const n = Number(u as any);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function sanitizeArtworkRecord(u: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (u && typeof u === "object" && !Array.isArray(u)) {
    for (const [k, v] of Object.entries(u as Record<string, unknown>)) {
      const side = String(k).trim();
      const url = String(v ?? "").trim();
      if (side && url) out[side] = url;
    }
  }
  return out;
}

function mergeArtwork(
  base: Record<string, string>,
  rows: Array<{ side: number; url: string }>
): Record<string, string> {
  const out: Record<string, string> = { ...base };
  for (const r of rows) {
    const s = Number(r.side);
    if (Number.isFinite(s) && r.url) out[String(s)] = String(r.url);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type RowRaw = {
  id: string;
  productId: number;
  quantity: number;
  optionIdsRaw: unknown; // jsonb
  artworkRaw?: unknown;  // jsonb { [side]: url }
};

// ─────────────────────────────────────────────────────────────
// GET /api/cart  → DB-backed cart with live SinaLite pricing
// ─────────────────────────────────────────────────────────────
export async function GET() {
  const sid = getOrSetSid();

  let cart = await db.query.carts.findFirst({
    where: and(eq(carts.sid, sid), eq(carts.status, "open")),
  });

  if (!cart) {
    const [row] = await db.insert(carts).values({ sid }).returning();
    cart = row;
  }

  const rowsDb = (await db
    .select({
      id: cartLines.id,
      productId: cartLines.productId,
      quantity: cartLines.quantity,
      optionIdsRaw: cartLines.optionIds,
      artworkRaw: cartLines.artwork,
    })
    .from(cartLines)
    .where(eq(cartLines.cartId, cart.id))) as RowRaw[];

  if (!rowsDb.length) {
    return NextResponse.json({
      ok: true,
      cart: { id: cart.id, currency: "USD", subtotal: 0, items: [] },
    });
  }

  // artwork rows
  const lineIds = rowsDb.map((r) => r.id);
  const artRows = await db
    .select({
      cartLineId: cartArtwork.cartLineId,
      side: cartArtwork.side,
      url: cartArtwork.url,
    })
    .from(cartArtwork)
    .where(inArray(cartArtwork.cartLineId, lineIds));

  const artworkByLine: Record<string, Array<{ side: number; url: string }>> = {};
  for (const ar of artRows) {
    (artworkByLine[ar.cartLineId] ||= []).push({ side: ar.side, url: ar.url });
  }

  const items = await Promise.all(
    rowsDb.map(async (r) => {
      const productId = Number(r.productId);
      const quantity = toPositiveInt(r.quantity, 1);
      const optionIds = toNumberArray(r.optionIdsRaw);

      // Live price from SinaLite (per docs)
      const priced = await getConfiguredPrice(productId, optionIds, quantity);
      const unitPrice = Number(priced?.unitPrice ?? 0);
      const currency = (priced?.currency ?? "USD") as "USD" | "CAD";

      // artwork merge
      const artMapFromLine = sanitizeArtworkRecord(r.artworkRaw);
      const artRowsForLine = artworkByLine[r.id] ?? [];
      const artwork = mergeArtwork(artMapFromLine, artRowsForLine);

      // ✅ Cloudflare-only image id from JSON map
      const cloudflareId = cfImageIdForProduct(productId) ?? null;

      return {
        id: r.id,
        productId,
        quantity,
        optionIds,
        unitPrice,
        lineTotal: unitPrice * quantity,
        currency,
        name: null as string | null,
        image: cloudflareId, // CF Image ID only
        artwork,
      };
    })
  );

  const currency = (items[0]?.currency ?? "USD") as "USD" | "CAD";
  const subtotal = items.reduce((sum, it) => sum + (it.lineTotal ?? 0), 0);

  return NextResponse.json({
    ok: true,
    cart: { id: cart.id, currency, subtotal, items },
  });
}
