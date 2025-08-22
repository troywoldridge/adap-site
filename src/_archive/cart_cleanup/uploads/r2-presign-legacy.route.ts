import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type R2Env = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBase: string;
};

function readR2Env(): R2Env {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
    R2_BUCKET_NAME,
    R2_PUBLIC_BASE,
    R2_PUBLIC_BASEURL,
  } = process.env;

  const bucket = (R2_BUCKET || R2_BUCKET_NAME || "").trim();
  const publicBase = (R2_PUBLIC_BASE || R2_PUBLIC_BASEURL || "").trim();

  const missing: string[] = [];
  if (!R2_ACCOUNT_ID?.trim()) missing.push("R2_ACCOUNT_ID");
  if (!R2_ACCESS_KEY_ID?.trim()) missing.push("R2_ACCESS_KEY_ID");
  if (!R2_SECRET_ACCESS_KEY?.trim()) missing.push("R2_SECRET_ACCESS_KEY");
  if (!bucket) missing.push("R2_BUCKET or R2_BUCKET_NAME");
  if (!publicBase) missing.push("R2_PUBLIC_BASE or R2_PUBLIC_BASEURL");

  if (missing.length) {
    throw new Error(`Missing R2 env vars: ${missing.join(", ")}`);
  }

  return {
    accountId: R2_ACCOUNT_ID!.trim(),
    accessKeyId: R2_ACCESS_KEY_ID!.trim(),
    secretAccessKey: R2_SECRET_ACCESS_KEY!.trim(),
    bucket,
    publicBase,
  };
}

function bad(status: number, msg: string) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return bad(401, "Unauthorized");

  let cfg: R2Env;
  try {
    cfg = readR2Env();
  } catch (e: any) {
    return bad(500, e?.message || "Server configuration error");
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return bad(400, "Invalid JSON");
  }

  const filename: string | undefined = body?.filename;
  const contentType: string = (body?.contentType || "application/octet-stream") as string;

  // Accept either orderSessionId (preferred during checkout) or orderId (final order)
  const orderSessionId: string | undefined = body?.orderSessionId;
  const orderId: string | number | undefined = body?.orderId;
  const productId: string | number | undefined = body?.productId;
  const sideIndex: number = Number.isInteger(body?.sideIndex) ? Number(body.sideIndex) : 0;

  if (!filename || (!orderSessionId && !orderId)) {
    return bad(400, "filename and (orderSessionId OR orderId) are required");
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  const safeName = String(filename).replace(/[^\w.\-]+/g, "_");
  const now = Date.now();
  const productPart = productId ? `product_${productId}` : "product_unknown";

  // Prefer session keying during checkout; fall back to numeric order
  const scope = orderSessionId ? `session_${orderSessionId}` : `order_${orderId}`;
  const key = `orders/${scope}/${productPart}/side_${sideIndex}/${now}__${safeName}`;

  const putCmd = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, putCmd, { expiresIn: 600 });
  const publicUrl = `${cfg.publicBase.replace(/\/+$/, "")}/${key}`;

  return NextResponse.json({
    uploadUrl,
    publicUrl,
    storageKey: key,
    bucket: cfg.bucket,
  });
}
