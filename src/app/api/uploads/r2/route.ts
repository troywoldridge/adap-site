// src/app/api/uploads/r2/route.ts
import "server-only";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2PublicBaseUrl } from "@/lib/r2Public";
import { dbClient as db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ACCOUNT = process.env.R2_ACCOUNT_ID || "";
const ACCESS  = process.env.R2_ACCESS_KEY_ID || "";
const SECRET  = process.env.R2_SECRET_ACCESS_KEY || "";
const BUCKET  = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || "";
const PREFIX  = (process.env.R2_UPLOAD_PREFIX || "uploads").replace(/^\/+|\/+$/g, "");
const EXPIRES = Math.max(60, Number(process.env.R2_PRESIGN_EXPIRES_SECONDS || 900));

function json(body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function s3() {
  if (!ACCOUNT || !ACCESS || !SECRET || !BUCKET) {
    const miss = [
      !ACCOUNT && "R2_ACCOUNT_ID",
      !ACCESS && "R2_ACCESS_KEY_ID",
      !SECRET && "R2_SECRET_ACCESS_KEY",
      !BUCKET && "R2_BUCKET|R2_BUCKET_NAME",
    ].filter(Boolean).join(", ");
    throw new Error(`Missing env: ${miss}`);
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: ACCESS, secretAccessKey: SECRET },
    forcePathStyle: true,
  });
}

const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};

async function readSid() {
  const jar = (await (cookies() as any)) || cookies();
  return jar?.get?.("sid")?.value ?? jar?.get?.("adap_sid")?.value;
}
function setSid(res: NextResponse, sid: string) {
  res.cookies.set("sid", sid, COOKIE_OPTS);
  res.cookies.set("adap_sid", sid, COOKIE_OPTS);
}

function safeName(name: string) {
  return String(name || "file").replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-180);
}

export async function POST(req: NextRequest) {
  try {
    const PUBLIC_BASE = getR2PublicBaseUrl(); // throws if invalid

    const body = await req.json().catch(() => null);
    if (!body) return json({ ok: false, error: "Invalid JSON body" }, 400);

    const filename = safeName(body.filename);
    const contentType = String(body.contentType || "application/octet-stream");
    const lineId = body?.lineId ? String(body.lineId) : undefined;

    if (!filename) return json({ ok: false, error: "filename required" }, 400);

    // session & cart
    let sid = await readSid();
    if (!sid) sid = crypto.randomUUID();

    const cart = await db.query.carts.findFirst({ where: and(eq(carts.sid, sid), eq(carts.status, "open")) });
    if (!cart) {
      const res = json({ ok: false, error: "cart not found" }, 404);
      setSid(res, sid);
      return res;
    }

    if (lineId) {
      const line = await db.query.cartLines.findFirst({ where: and(eq(cartLines.id, lineId), eq(cartLines.cartId, cart.id)) });
      if (!line) {
        const res = json({ ok: false, error: "line not found" }, 404);
        setSid(res, sid);
        return res;
      }
    }

    const key = [PREFIX, "artwork", cart.id, lineId ?? "misc", `${Date.now()}-${filename}`]
      .filter(Boolean)
      .join("/");

    const put = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(s3(), put, { expiresIn: EXPIRES });

    const publicUrl = new URL(key.replace(/^\/+/, ""), PUBLIC_BASE + "/").toString();

    const res = json({ ok: true, uploadUrl, key, publicUrl }, 200);
    setSid(res, sid);
    return res;
  } catch (err: any) {
    console.error("[/api/uploads/r2] error:", err?.message);
    return json({ ok: false, error: err?.message || "upload presign error" }, 500);
  }
}

// quick health check
export async function GET() {
  try {
    getR2PublicBaseUrl();
    return json({ ok: true });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "bad config" }, 500);
  }
}
