/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema/cart";
import { cartArtwork } from "@/db/schema/cart-artwork";
import { getOrSetSid } from "@/lib/sid";

// 💸 SinaLite pricing + options (per official docs you provided)
import {
  getConfiguredPrice,
  getSinaliteProductArrays,
  normalizeOptionGroups,
} from "@/lib/sinalite.client";

// 📸 Cloudflare Images (we return the id; client builds CDN URL)
import { cfImageIdForProduct } from "@/lib/productAssets";

/* ───────────────── helpers ───────────────── */

type RowRaw = {
  id: string;
  productId: number;
  quantity: number;
  optionIdsRaw: unknown;
  artworkRaw?: unknown;
};

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

/** Resolve a sane default config from SinaLite product options (per docs). */
async function resolveDefaultOptionIds(productId: number): Promise<number[]> {
  try {
    const { optionsArray } = await getSinaliteProductArrays(String(productId));
    const groups = normalizeOptionGroups(optionsArray || []);
    // Pick explicit default if present, else the first option in each group.
    const ids: number[] = [];
    for (const g of (groups as any[])) {
      const opts: any[] =
        Array.isArray((g as any)?.options) ? (g as any).options : [];
      if (!opts.length) continue;
      const def =
        opts.find((o) => o?.isDefault || o?.default === true) ?? opts[0];
      const idNum = Number(def?.id);
      if (Number.isFinite(idNum) && idNum > 0) ids.push(idNum);
    }
    return ids;
  } catch {
    return [];
  }
}

/* ───────────────── GET /api/cart ───────────────── */

export async function GET() {
  const sid = await getOrSetSid();

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

  // gather per-side artwork
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
  for (const ar of artRows) (artworkByLine[ar.cartLineId] ||= []).push({ side: ar.side, url: ar.url });

  // build items (heal empty option_ids using SinaLite defaults)
  const items = await Promise.all(
    rowsDb.map(async (r) => {
      const productId = Number(r.productId);
      const quantity = toPositiveInt(r.quantity, 1);
      let optionIds = toNumberArray(r.optionIdsRaw);

      if (optionIds.length === 0) {
        const healed = await resolveDefaultOptionIds(productId);
        if (healed.length) {
          optionIds = healed;
          // Persist back so the cart line is healthy going forward
          await db
            .update(cartLines)
            .set({ optionIds: healed })
            .where(eq(cartLines.id, r.id));
        }
      }

      // Live price (SinaLite docs: price depends on configured options + qty)
      const priced = await getConfiguredPrice(productId, optionIds, quantity);
      const unitPrice = Number(priced?.unitPrice ?? 0);
      const currency = (priced?.currency ?? "USD") as "USD" | "CAD";

      // artwork combine
      const artMapFromLine = sanitizeArtworkRecord(r.artworkRaw);
      const artRowsForLine = artworkByLine[r.id] ?? [];
      const artwork = mergeArtwork(artMapFromLine, artRowsForLine);

      // Cloudflare Image ID (client builds imagedelivery URL)
      const cloudflareId = cfImageIdForProduct(productId) ?? null;

      return {
        id: r.id,
        productId,
        quantity,
        optionIds,
        unitPrice,                          // server-seeded unit price
        lineTotal: unitPrice * quantity,
        currency,
        name: null as string | null,
        image: cloudflareId,                // CF image id only
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
