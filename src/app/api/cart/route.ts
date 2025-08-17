/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema/cart";
import { cartArtwork } from "@/db/schema/cart-artwork";
import { getConfiguredPrice } from "@/lib/sinalite.client";

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

/** Normalize a drizzle `jsonb` (runtime: unknown) into `number[]`. */
function toNumberArray(u: unknown): number[] {
  if (!Array.isArray(u)) {
    return [];
  }
  const out: number[] = [];
  for (const v of u) {
    const n = Number(v as any);
    if (Number.isFinite(n)) {
      out.push(n);
    }
  }
  return out;
}

/** Force any numeric-ish value to a positive int (>=1). */
function toPositiveInt(u: unknown, fallback = 1): number {
  const n = Number(u as any);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Convert `{ [side]: url }` (or bad shapes) into a sanitized record. */
function sanitizeArtworkRecord(u: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (u && typeof u === "object" && !Array.isArray(u)) {
    for (const [k, v] of Object.entries(u as Record<string, unknown>)) {
      const side = String(k).trim();
      const url = String(v ?? "").trim();
      if (side && url) {
        out[side] = url;
      }
    }
  }
  return out;
}

/** Merge two per-side artwork records, rows override base. */
function mergeArtwork(
  base: Record<string, string>,
  rows: Array<{ side: number; url: string }>
): Record<string, string> {
  const out: Record<string, string> = { ...base };
  for (const r of rows) {
    const s = Number(r.side);
    if (Number.isFinite(s) && r.url) {
      out[String(s)] = String(r.url);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Types for local select coercion (remove “unknown” headaches)
// ─────────────────────────────────────────────────────────────
type RowRaw = {
  id: string;
  productId: number;
  quantity: number;
  optionIdsRaw: unknown; // jsonb
  artworkRaw?: unknown;  // jsonb { [side]: url } (your cart_lines.artwork)
  name?: string | null;  // optional future column
  image?: string | null; // optional future column
};

// ─────────────────────────────────────────────────────────────
// GET /api/cart
// ─────────────────────────────────────────────────────────────
export async function GET() {
  // 1) Ensure open cart
  const sid = getOrSetSid();

  let cart = await db.query.carts.findFirst({
    where: and(eq(carts.sid, sid), eq(carts.status, "open")),
  });

  if (!cart) {
    const [row] = await db.insert(carts).values({ sid }).returning();
    cart = row;
  }

  // 2) Fetch cart lines (use explicit field names to keep types happy)
  const rowsDb = (await db
    .select({
      id: cartLines.id,
      productId: cartLines.productId,
      quantity: cartLines.quantity,
      optionIdsRaw: cartLines.optionIds, // jsonb<number[] | null> at the DB level
      // cart_lines.artwork exists in your schema; we’ll read it but sanitize
      artworkRaw: cartLines.artwork,
      // Optional future columns (presently not in your schema, so we omit them from select)
      // name: (cartLines as any).name,
      // image: (cartLines as any).image,
    })
    .from(cartLines)
    .where(eq(cartLines.cartId, cart.id))) as RowRaw[];

  if (!rowsDb.length) {
    return NextResponse.json({
      id: cart.id,
      currency: "USD",
      subtotal: 0,
      items: [],
    });
  }

  // 3) Fetch per-side artwork rows from cart_artwork and index by line
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
    if (!artworkByLine[ar.cartLineId]) {
      artworkByLine[ar.cartLineId] = [];
    }
    artworkByLine[ar.cartLineId].push({ side: ar.side, url: ar.url });
  }

  // 4) Build items with pricing + merged artwork
  const items = await Promise.all(
    rowsDb.map(async (r) => {
      const productId = Number(r.productId);
      const quantity = toPositiveInt(r.quantity, 1);
      const optionIds = toNumberArray(r.optionIdsRaw);

      // Sinalite price (assists qty when needed)
      const priced = await getConfiguredPrice(productId, optionIds, quantity);
      const unitPrice = priced?.unitPrice ?? 0;
      const currency = (priced?.currency ?? "USD") as "USD" | "CAD";

      // Merge artwork map from cart_lines.artwork with cart_artwork rows (rows win)
      const artMapFromLine = sanitizeArtworkRecord(r.artworkRaw);
      const artRowsForLine = artworkByLine[r.id] ?? [];
      const artwork: Record<string, string> = mergeArtwork(artMapFromLine, artRowsForLine);

      return {
        id: r.id,
        productId,
        quantity,
        optionIds,
        unitPrice,
        lineTotal: unitPrice * quantity,
        currency,
        // You can wire these later if you add columns
        name: null as string | null,
        image: null as string | null,
        // Per-side artwork record: { "1": "https://…", "2": "https://…" }
        artwork,
      };
    })
  );

  // 5) Totals
  const currency = (items[0]?.currency ?? "USD") as "USD" | "CAD";
  const subtotal = items.reduce((sum, it) => sum + (it.lineTotal ?? 0), 0);

  // 6) Return
  return NextResponse.json({
    id: cart.id,
    currency,
    subtotal,
    items,
  });
}
