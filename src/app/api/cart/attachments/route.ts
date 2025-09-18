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

/* ───────── helpers ───────── */
function jsonNoStore(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};

async function readSid(): Promise<string | undefined> {
  const maybe = cookies() as any;
  const jar = typeof maybe?.then === "function" ? await maybe : maybe;
  return jar?.get?.("sid")?.value ?? jar?.get?.("adap_sid")?.value;
}
function setSid(res: NextResponse, sid: string) {
  res.cookies.set("sid", sid, COOKIE_OPTS);
  res.cookies.set("adap_sid", sid, COOKIE_OPTS);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Used when client only sends one of key/url. */
const R2_PUBLIC_BASEURL =
  process.env.R2_PUBLIC_BASEURL ?? process.env.R2_PUBLIC_BASE_URL ?? "";

/** From storageId (url or key) → { key, url } aligned to Cloudflare CDN delivery. */
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
      } catch {
        /* ignore */
      }
    }
    try {
      const u = new URL(storageId);
      const key = u.pathname.replace(/^\/+/, "");
      return { key, url: storageId };
    } catch {
      /* ignore */
    }
  }
  const key = storageId.replace(/^\/+/, "");
  const base = R2_PUBLIC_BASEURL
    ? (R2_PUBLIC_BASEURL.endsWith("/")
        ? R2_PUBLIC_BASEURL
        : R2_PUBLIC_BASEURL + "/")
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

/** Client may send parts in any of these shapes. */
type ClientPart =
  | { key: string; url: string; fileName?: string }
  | { storageId: string; fileName?: string }
  | { key: string; publicUrl: string; fileName?: string };

type ClientCartLine = { id?: string; lineId?: string; quantity?: number };

export async function POST(req: NextRequest) {
  try {
    let body: {
      productId: number; // REQUIRED by your table
      cartLines: ClientCartLine[];
      parts: ClientPart[];
    };

    try {
      body = (await req.json()) as any;
    } catch {
      return jsonNoStore({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const productId = Number(body?.productId);
    if (!Number.isFinite(productId)) {
      return jsonNoStore(
        { ok: false, error: "productId is required (number)" },
        400
      );
    }
    if (!Array.isArray(body?.cartLines) || body.cartLines.length === 0) {
      return jsonNoStore({ ok: false, error: "cartLines are required" }, 400);
    }
    if (!Array.isArray(body?.parts) || body.parts.length === 0) {
      return jsonNoStore({ ok: false, error: "parts are required" }, 400);
    }

    // Normalize line IDs (accept {id} or {lineId})
    const lineIds = body.cartLines
      .map((l) => (l.lineId ?? l.id ?? "").trim())
      .filter(isNonEmptyString);

    if (lineIds.length === 0) {
      return jsonNoStore(
        { ok: false, error: "No valid cart line IDs provided" },
        400
      );
    }

    // Normalize parts → { key, url, fileName }
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
          (typeof p.fileName === "string" && p.fileName.trim()) ||
          filenameFrom(url || key);

        return { key, url, fileName };
      })
      .filter(Boolean) as Array<{ key: string; url: string; fileName: string }>;

    if (parts.length === 0) {
      return jsonNoStore(
        { ok: false, error: "No valid parts (key+url) provided" },
        400
      );
    }

    // Ensure session & open cart
    let sid = await readSid();
    if (!sid) sid = crypto.randomUUID();

    const cart = await db.query.carts.findFirst({
      where: and(eq(carts.sid, sid), eq(carts.status, "open")),
    });

    if (!cart) {
      const res = jsonNoStore({ ok: false, error: "cart not found" }, 404);
      setSid(res, sid);
      return res;
    }

    // Verify all provided lines belong to this cart
    const existingLines = await db.query.cartLines.findMany({
      where: and(eq(cartLines.cartId, cart.id), inArray(cartLines.id, lineIds)),
      columns: { id: true },
    });
    const okSet = new Set(existingLines.map((r: { id: any; }) => r.id));
    const missing = lineIds.filter((id) => !okSet.has(id));
    if (missing.length) {
      return jsonNoStore(
        { ok: false, error: `line(s) not found in this cart: ${missing.join(", ")}` },
        404
      );
    }

    // Attach to the FIRST line (matches current UI flow)
    const targetLineId = lineIds[0];

    // De-dupe by (lineId, key)
    const seen = new Set<string>();
    const now = new Date();
    const rows = parts
      .map((p) => {
        const dedupeKey = `${targetLineId}::${p.key}`;
        if (seen.has(dedupeKey)) return null;
        seen.add(dedupeKey);

        return {
          cartId: cart.id,
          lineId: targetLineId,
          productId, // ✅ table requires
          fileName: p.fileName, // ✅ table requires
          key: p.key,
          url: p.url, // served via Cloudflare CDN
          createdAt: now,
          updatedAt: now, // ✅ table requires
        };
      })
      .filter(Boolean) as Array<{
      cartId: string;
      lineId: string;
      productId: number;
      fileName: string;
      key: string;
      url: string;
      createdAt: Date;
      updatedAt: Date;
    }>;

    if (rows.length === 0) {
      const res = jsonNoStore(
        { ok: true, attached: 0, attempted: 0, skipped: 0 },
        200
      );
      setSid(res, sid);
      return res;
    }

    const inserted = await db
      .insert(cartAttachments)
      .values(rows)
      .onConflictDoNothing({
        // ✅ use REAL columns; unique index exists in DB
        target: [cartAttachments.lineId, cartAttachments.key],
      })
      .returning({ id: cartAttachments.id });

    // Optional hygiene — keep one per (line_id, key)
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
      attached: inserted.length,
      attempted: rows.length,
      skipped: rows.length - inserted.length,
    });
    setSid(res, sid);
    return res;
  } catch (e: any) {
    console.error("[/api/cart/attachments] error:", e?.message, e?.stack);
    return jsonNoStore(
      { ok: false, error: e?.message || "Failed to save attachments" },
      500
    );
  }
}
