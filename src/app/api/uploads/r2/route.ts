// src/app/api/uploads/r2/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2PublicBaseUrl } from "@/lib/r2Public";

import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ───────────── env ───────────── */
// Accept either spelling for the public base:
const R2_PUBLIC_BASEURL =
  process.env.R2_PUBLIC_BASEURL ?? process.env.R2_PUBLIC_BASE_URL ?? "";
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const R2_BUCKET = process.env.R2_BUCKET ?? "";
const R2_UPLOAD_PREFIX = (process.env.R2_UPLOAD_PREFIX || "uploads").replace(/^\/+|\/+$/g, "");
const R2_PRESIGN_EXPIRES_SECONDS = Math.max(
  60,
  Number(process.env.R2_PRESIGN_EXPIRES_SECONDS || 900)
);

function assertEnv() {
  const base = getR2PublicBaseUrl(); // throws if invalid
  return { base };
  const missing: string[] = [];
  if (!R2_ACCOUNT_ID) missing.push("R2_ACCOUNT_ID");
  if (!R2_ACCESS_KEY_ID) missing.push("R2_ACCESS_KEY_ID");
  if (!R2_SECRET_ACCESS_KEY) missing.push("R2_SECRET_ACCESS_KEY");
  if (!R2_BUCKET) missing.push("R2_BUCKET");
  if (!R2_PUBLIC_BASEURL) missing.push("R2_PUBLIC_BASEURL|R2_PUBLIC_BASE_URL");
  if (missing.length) throw new Error(`Missing env: ${missing.join(", ")}`);
  try {
    new URL(R2_PUBLIC_BASEURL);
  } catch {
    throw new Error("R2_PUBLIC_BASEURL must be an absolute URL");
  }
}

/* ───────────── cookies ───────────── */
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

function setSidCookies(res: NextResponse, sid: string) {
  res.cookies.set("sid", sid, COOKIE_OPTS);
  res.cookies.set("adap_sid", sid, COOKIE_OPTS);
}

/* ───────────── utils ───────────── */
function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-180);
}

function makeS3() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    forcePathStyle: true,
  });
}

/** Build a brand-new NextResponse with JSON + no-store headers */
function jsonNoStore(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

/* ───────────── route ───────────── */
export async function POST(req: NextRequest) {
  try {
    assertEnv();

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return jsonNoStore({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const filename = String(body?.filename || "");
    const contentType = String(body?.contentType || "");
    const lineId = body?.lineId ? String(body.lineId) : undefined;

    if (!filename || !contentType) {
      return jsonNoStore({ ok: false, error: "filename and contentType required" }, 400);
    }

    // session SID (create if missing)
    let sid = await readSid();
    if (!sid) sid = crypto.randomUUID();

    // ensure open cart for this SID
    const cart = await db.query.carts.findFirst({
      where: and(eq(carts.sid, sid), eq(carts.status, "open")),
    });
    if (!cart) {
      const res = jsonNoStore({ ok: false, error: "cart not found" }, 404);
      setSidCookies(res, sid);
      return res;
    }

    // verify the cart line (if provided)
    if (lineId) {
      const line = await db.query.cartLines.findFirst({
        where: and(eq(cartLines.id, lineId), eq(cartLines.cartId, cart.id)),
      });
      if (!line) {
        const res = jsonNoStore({ ok: false, error: "line not found" }, 404);
        setSidCookies(res, sid);
        return res;
      }
    }

    // Object key
    const key = [
      R2_UPLOAD_PREFIX,
      "artwork",
      cart.id,
      lineId ?? "misc",
      `${Date.now()}-${safeName(filename)}`,
    ]
      .filter(Boolean)
      .join("/");

    // Presigned PUT
    const s3 = makeS3();
    const cmd = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType || "application/octet-stream",
    });
    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: R2_PRESIGN_EXPIRES_SECONDS });

    // Public CDN URL (Cloudflare in front of R2)
    const base = R2_PUBLIC_BASEURL.endsWith("/") ? R2_PUBLIC_BASEURL : R2_PUBLIC_BASEURL + "/";
    const publicUrl = (() => {
      try {
        return new URL(key, base).toString();
      } catch {
        return base + key;
      }
    })();

    const res = jsonNoStore({ ok: true, uploadUrl, key, publicUrl }, 200);
    setSidCookies(res, sid);
    return res;
  } catch (err: any) {
    console.error("[/api/uploads/r2] error:", err?.message, err?.stack);
    return jsonNoStore(
      { ok: false, error: err?.message ?? "upload presign error" },
      500
    );
  }
}
