// Force Node runtime so AWS SDK works
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function need(name: string) {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`[presign] Missing env ${name}`);
  }
  return v;
}

// Accept your exact env names, with safe fallbacks
const ACCOUNT_ID = need("R2_ACCOUNT_ID");
const ACCESS_KEY = need("R2_ACCESS_KEY_ID");
const SECRET_KEY = need("R2_SECRET_ACCESS_KEY");
// You provided R2_BUCKET_NAME (not R2_BUCKET) – support both:
const BUCKET = (process.env.R2_BUCKET_NAME || process.env.R2_BUCKET)?.trim();
if (!BUCKET) {
  throw new Error("[presign] Missing env R2_BUCKET_NAME (or R2_BUCKET)");
}

const PUBLIC_BASE = need("R2_PUBLIC_BASE_URL"); // e.g. https://cdn.adap.com/artwork
const UPLOAD_PREFIX = (process.env.R2_UPLOAD_PREFIX ?? "uploads").replace(/^\/+|\/+$/g, "");
const EXPIRES = Number(process.env.R2_PRESIGN_EXPIRES_SECONDS ?? 900);

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

type ReqBody = {
  filename: string;
  contentType: string;
  lineId?: string;
  side?: number;
};

export async function POST(req: Request) {
  try {
    const text = await req.text();
    let body: ReqBody;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { filename, contentType } = body;
    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Missing filename or contentType" },
        { status: 400 }
      );
    }

    // Stable key under your prefix
    const ext = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "bin";
    const key = `${UPLOAD_PREFIX}/${crypto.randomUUID()}.${ext}`;

    // Presign PUT
    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: EXPIRES });

    // Public CDN URL for immediate read
    const publicUrl = `${PUBLIC_BASE.replace(/\/+$/, "")}/${key}`;

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
      bucket: BUCKET,
      expiresIn: EXPIRES,
    });
  } catch (e: any) {
    console.error("[presign] error:", e);
    return NextResponse.json({ error: e?.message || "presign failed" }, { status: 500 });
  }
}
