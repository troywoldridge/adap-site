/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema/cart";

// ✅ Force Node.js runtime (AWS SDK + crypto require Node)
export const runtime = "nodejs";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_BASEURL = process.env.R2_PUBLIC_BASEURL; // e.g. https://cdn.yourdomain.com/

function assertEnv() {
  const missing: string[] = [];
  if (!R2_ACCOUNT_ID) missing.push("R2_ACCOUNT_ID");
  if (!R2_ACCESS_KEY_ID) missing.push("R2_ACCESS_KEY_ID");
  if (!R2_SECRET_ACCESS_KEY) missing.push("R2_SECRET_ACCESS_KEY");
  if (!R2_BUCKET) missing.push("R2_BUCKET");
  if (!R2_PUBLIC_BASEURL) missing.push("R2_PUBLIC_BASEURL");
  if (missing.length) throw new Error(`Missing env: ${missing.join(", ")}`);
  // Must be absolute URL
  try { new URL(R2_PUBLIC_BASEURL!); } catch { throw new Error("R2_PUBLIC_BASEURL must be an absolute URL"); }
}

function getOrSetSid(): string {
  const jar = cookies();
  let sid = jar.get("sid")?.value;
  if (!sid) {
    sid = crypto.randomUUID();
    jar.set("sid", sid, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  }
  return sid;
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-80);
}

function s3Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID!, secretAccessKey: R2_SECRET_ACCESS_KEY! },
  });
}

export async function POST(req: NextRequest) {
  try {
    assertEnv();

    const { filename, contentType, cartId: _cartId, lineId } = (await req.json()) as {
      filename: string;
      contentType: string;
      cartId?: string;
      lineId?: string;
    };

    if (!filename || !contentType) {
      return Response.json({ ok: false, error: "filename and contentType required" }, { status: 400 });
    }

    const sid = getOrSetSid();
    const cart = await db.query.carts.findFirst({ where: and(eq(carts.sid, sid), eq(carts.status, "open")) });
    if (!cart) return Response.json({ ok: false, error: "cart not found" }, { status: 404 });

    if (lineId) {
      const line = await db.query.cartLines.findFirst({
        where: and(eq(cartLines.id, lineId), eq(cartLines.cartId, cart.id)),
      });
      if (!line) return Response.json({ ok: false, error: "line not found" }, { status: 404 });
    }

    const key = `artwork/${cart.id}/${lineId ?? "misc"}/${Date.now()}-${safeName(filename)}`;

    const s3 = s3Client();
    const cmd = new PutObjectCommand({
      Bucket: R2_BUCKET!,
      Key: key,
      ContentType: contentType || "application/octet-stream",
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });
    const base = R2_PUBLIC_BASEURL!.endsWith("/") ? R2_PUBLIC_BASEURL! : R2_PUBLIC_BASEURL! + "/";
    const publicUrl = new URL(key, base).toString();

    return Response.json({ ok: true, uploadUrl, key, publicUrl });
  } catch (err: any) {
    // 👇 Return a readable error so the browser console shows the actual cause
    return Response.json({ ok: false, error: err?.message ?? "upload presign error" }, { status: 500 });
  }
}
