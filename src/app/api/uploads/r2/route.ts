/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";

// ✅ Force Node.js runtime (AWS SDK + crypto require Node)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ─────────────── env ─────────────── */
const {R2_ACCOUNT_ID} = process.env;
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
  try {
    new URL(R2_PUBLIC_BASEURL!);
  } catch {
    throw new Error("R2_PUBLIC_BASEURL must be an absolute URL");
  }
}

/* ───────────── cookies (Next 14/15 safe) ───────────── */
const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

// Next 14/15 compatible cookie jar getter
async function getJar() {
  const maybe = cookies() as any;
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

async function getOrSetSid(): Promise<string> {
  const jar = await getJar();
  let sid = (jar.get?.("sid")?.value ?? jar.get?.("adap_sid")?.value) as string | undefined;
  if (!sid) {
    sid = crypto.randomUUID();
  }
  // keep both names in sync
  jar.set?.("sid", sid, COOKIE_OPTS);
  jar.set?.("adap_sid", sid, COOKIE_OPTS);
  return sid;
}

/* ───────────── utils ───────────── */
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

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return res;
}

/* ───────────── route ───────────── */
export async function POST(req: NextRequest) {
  // Create a response first so any Set-Cookie from cookies().set is preserved reliably
  let res = NextResponse.json({ ok: true });

  try {
    assertEnv();

    const { filename, contentType, cartId: _cartId, lineId } = (await req.json()) as {
      filename: string;
      contentType: string;
      cartId?: string;
      lineId?: string;
    };

    if (!filename || !contentType) {
      return noStore(
        NextResponse.json({ ok: false, error: "filename and contentType required" }, { status: 400 }),
      );
    }

    // Ensure a session SID (keeps product → cart → review consistent)
    const sid = await getOrSetSid();

    // Find/open cart for this SID
    const cart = await db.query.carts.findFirst({
      where: and(eq(carts.sid, sid), eq(carts.status, "open")),
    });
    if (!cart) {
      return noStore(NextResponse.json({ ok: false, error: "cart not found" }, { status: 404 }));
    }

    // If targeting a specific line, verify it belongs to this cart
    if (lineId) {
      const line = await db.query.cartLines.findFirst({
        where: and(eq(cartLines.id, lineId), eq(cartLines.cartId, cart.id)),
      });
      if (!line) {
        return noStore(NextResponse.json({ ok: false, error: "line not found" }, { status: 404 }));
      }
    }

    const key = `artwork/${cart.id}/${lineId ?? "misc"}/${Date.now()}-${safeName(filename)}`;

    const s3 = s3Client();
    const cmd = new PutObjectCommand({
      Bucket: R2_BUCKET!,
      Key: key,
      ContentType: contentType || "application/octet-stream",
    });

    // short-lived upload URL
    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });

    // public CDN URL (delivered via Cloudflare!)
    const base = R2_PUBLIC_BASEURL!.endsWith("/") ? R2_PUBLIC_BASEURL! : R2_PUBLIC_BASEURL! + "/";
    const publicUrl = new URL(key, base).toString();

    // Return, preserving no-store and any Set-Cookie headers
    res = NextResponse.json({ ok: true, uploadUrl, key, publicUrl }, { headers: res.headers });
    return noStore(res);
  } catch (err: any) {
    return noStore(
      NextResponse.json(
        { ok: false, error: err?.message ?? "upload presign error" },
        { status: 500, headers: res.headers },
      ),
    );
  }
}
