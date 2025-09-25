// src/app/api/cart/attachments/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { cartAttachments } from "@/db/schema/cartAttachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
  domain: COOKIE_DOMAIN,
};

function jsonNoStore(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

async function readSid(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get("sid")?.value ?? jar.get("adap_sid")?.value;
}
function setSid(res: NextResponse, sid: string) {
  res.cookies.set("sid", sid, COOKIE_OPTS);
  res.cookies.set("adap_sid", sid, COOKIE_OPTS);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Public base used to build Cloudflare-CDN URLs for R2 keys */
const R2_PUBLIC_BASEURL =
  process.env.R2_PUBLIC_BASEURL ?? process.env.R2_PUBLIC_BASE_URL ?? "";

/** From storageId (url or key) → { key, url } normalized to Cloudflare CDN delivery */
function fromStorageId(storageIdRaw: string) {
  const storageId = storageIdRaw.trim();
  const looksLikeUrl = /^https?:\/\//i.test(storageId);
  if (looksLikeUrl) {
    if (R2_PUBLIC_BASEURL) {
      try {
        const base = R2_PUBLIC_BASEURL.endsWith("/")
          ? R2_PUBLIC_BASEURL
          : R2_PUBLIC_BASEURL + "/";
        const u = new URL(storageId);
        const b = new URL(base);
        if (u.origin === b.origin && u.pathname.startsWith(b.pathname)) {
          const key = u.pathname.slice(b.pathname.length).replace(/^\/+/, "");
          return { key, url: storageId };
        }
      } catch { /* ignore */ }
    }
    try {
      const u = new URL(storageId);
      const key = u.pathname.replace(/^\/+/, "");
      return { key, url: storageId };
    } catch { /* ignore */ }
  }
  const key = storageId.replace(/^\/+/, "");
  const base = R2_PUBLIC_BASEURL
    ? (R2_PUBLIC_BASEURL.endsWith("/") ? R2_PUBLIC_BASEURL : R2_PUBLIC_BASEURL + "/")
    : "";
  const url = base ? new URL(key, base).toString() : "";
  return { key, url };
}

function filenameFrom(pathOrUrl: string): string {
  try {
    const u = new URL(pathOrUrl);
    return u.pathname.split("/").filter(Boolean).pop() || "upload.pdf";
  } catch {
    return pathOrUrl.split("/").filter(Boolean).pop() || "upload.pdf";
  }
}

/** Client may send any of these shapes for each uploaded part */
type ClientPart =
  | { key: string; url: string; fileName?: string; thumbKey?: string; thumbUrl?: string; cfImageId?: string }
  | { storageId: string; fileName?: string; thumbKey?: string; thumbUrl?: string; cfImageId?: string }
  | { key: string; publicUrl: string; fileName?: string; thumbKey?: string; thumbUrl?: string; cfImageId?: string };

type ClientCartLine = { id?: string; lineId?: string; quantity?: number };

export async function POST(req: NextRequest) {
  try {
    let body: {
      productId: number;
      cartLines?: ClientCartLine[];
      parts: ClientPart[];
      qty?: number;
    };

    try {
      body = (await req.json()) as any;
    } catch {
      return jsonNoStore({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const productId = Number(body?.productId);
    if (!Number.isFinite(productId)) {
      return jsonNoStore({ ok: false, error: "productId is required (number)" }, 400);
    }
    if (!Array.isArray(body?.parts) || body.parts.length === 0) {
      return jsonNoStore({ ok: false, error: "parts are required" }, 400);
    }

    // Normalize line IDs (accept {id} or {lineId})
    const lineIdsFromClient = Array.isArray(body?.cartLines)
      ? body.cartLines
          .map((l) => (l?.lineId ?? l?.id ?? "").trim())
          .filter(isNonEmptyString)
      : [];

    // Normalize parts → { key, url, fileName, thumbKey?, thumbUrl?, cfImageId? }
    const parts = body.parts
      .map((p: any) => {
        const directKey = typeof p.key === "string" ? p.key.trim() : undefined;
        const directUrl =
          typeof p.url === "string"
            ? p.url.trim()
            : typeof p.publicUrl === "string"
            ? p.publicUrl.trim()
            : undefined;

        let key: string | undefined = directKey;
        let url: string | undefined = directUrl;

        if (!key || !url) {
          if (typeof p.storageId === "string") {
            const derived = fromStorageId(p.storageId);
            key = key || derived.key;
            url = url || derived.url;
          }
        }
        if (!key || !url) return null;

        const fileName: string =
          (typeof p.fileName === "string" && p.fileName.trim()) || filenameFrom(url || key);

        const thumbKey = typeof p.thumbKey === "string" ? p.thumbKey.trim() : undefined;
        const thumbUrl = typeof p.thumbUrl === "string" ? p.thumbUrl.trim() : undefined;
        const cfImageId = typeof p.cfImageId === "string" ? p.cfImageId.trim() : undefined;

        return { key, url, fileName, thumbKey, thumbUrl, cfImageId };
      })
      .filter(Boolean) as Array<{
        key: string;
        url: string;
        fileName: string;
        thumbKey?: string;
        thumbUrl?: string;
        cfImageId?: string;
      }>;

    if (parts.length === 0) {
      return jsonNoStore({ ok: false, error: "No valid parts (key+url) provided" }, 400);
    }

    // Ensure session + open cart
    let sid = await readSid();
    if (!sid) sid = crypto.randomUUID();

    let cart = await db.query.carts.findFirst({
      where: and(eq(carts.sid, sid), eq(carts.status, "open")),
    });

    if (!cart) {
      // auto-create cart if missing
      const [created] = await db
        .insert(carts)
        .values({ sid, status: "open" })
        .returning();
      cart = created;
    }

    // Determine a target line:
    // 1) If client provided existing line(s) that belong to this cart → use first
    // 2) Else auto-ensure a line for (cartId, productId)
    let targetLineId: string | null = null;

    if (lineIdsFromClient.length > 0) {
      const existingLines = await db.query.cartLines.findMany({
        where: and(eq(cartLines.cartId, cart.id), inArray(cartLines.id, lineIdsFromClient)),
        columns: { id: true },
      });
      if (existingLines.length > 0) {
        targetLineId = existingLines[0].id;
      }
    }

    if (!targetLineId) {
      // auto-ensure a line if none provided/found
      const qty = Number.isFinite(Number(body?.qty)) ? Math.max(1, Number(body!.qty)) : 1;
      const existing = await db.query.cartLines.findFirst({
        where: and(eq(cartLines.cartId, cart.id), eq(cartLines.productId, productId)),
      });
      if (existing) {
        await db
          .update(cartLines)
          .set({ quantity: Math.max(1, (existing.quantity ?? 1) + qty), updatedAt: sql`now()` })
          .where(eq(cartLines.id, existing.id));
        targetLineId = existing.id;
      } else {
        const [inserted] = await db
          .insert(cartLines)
          .values({ cartId: cart.id, productId, quantity: qty })
          .returning({ id: cartLines.id });
        targetLineId = inserted.id;
      }
    }

    // Prepare rows (explicitly include nullable thumb fields so Drizzle never emits DEFAULT)
    const seen = new Set<string>();
    const now = new Date();

    const rows: typeof cartAttachments.$inferInsert[] = parts
      .map((p) => {
        const dedupeKey = `${targetLineId}::${p.key}`;
        if (seen.has(dedupeKey)) return null;
        seen.add(dedupeKey);

        const thumbKey = typeof p.thumbKey === "string" && p.thumbKey.trim() ? p.thumbKey.trim() : null;
        const thumbUrl = typeof p.thumbUrl === "string" && p.thumbUrl.trim() ? p.thumbUrl.trim() : null;
        const cfImageId = typeof p.cfImageId === "string" && p.cfImageId.trim() ? p.cfImageId.trim() : null;

        return {
          cartId: cart!.id,
          lineId: targetLineId!,
          productId,
          fileName: p.fileName,
          key: p.key,
          url: p.url,            // served via Cloudflare CDN
          thumbKey,              // null or value (explicit!)
          thumbUrl,              // null or value (explicit!)
          cfImageId,             // null or value (explicit!)
          createdAt: now,
          updatedAt: now,
        } satisfies typeof cartAttachments.$inferInsert;
      })
      .filter(Boolean) as typeof cartAttachments.$inferInsert[];

    if (rows.length === 0) {
      const res = jsonNoStore({ ok: true, attached: 0, attempted: 0, skipped: 0 }, 200);
      setSid(res, sid);
      return res;
    }

    const inserted = await db
      .insert(cartAttachments)
      .values(rows)
      .onConflictDoNothing({
        target: [cartAttachments.lineId, cartAttachments.key],
      })
      .returning({ id: cartAttachments.id });

    // hygiene: keep one per (line_id, key)
    await db.execute(sql`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY line_id, key ORDER BY id) AS rn
        FROM cart_attachments
      )
      DELETE FROM cart_attachments
      WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    `);

    const res = jsonNoStore({
      ok: true,
      lineId: targetLineId,
      attached: inserted.length,
      attempted: rows.length,
      skipped: rows.length - inserted.length,
    });
    setSid(res, sid);
    return res;
  } catch (e: any) {
    console.error("[/api/cart/attachments] error:", e?.message, e?.stack);
    return jsonNoStore({ ok: false, error: e?.message || "Failed to save attachments" }, 500);
  }
}
