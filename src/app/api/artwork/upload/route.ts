import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireEnv() {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    R2_PUBLIC_BASEURL,
  } = process.env;

  if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET_NAME ||
    !R2_PUBLIC_BASEURL
  ) {
    throw new Error(
      "Missing R2 env vars. Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASEURL"
    );
  }

  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const s3 = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  return { s3, bucket: R2_BUCKET_NAME, publicBase: R2_PUBLIC_BASEURL };
}

function sanitize(s: string) {
  return s.replace(/[^\w.\-]+/g, "_").slice(0, 120);
}

function sideToType(sideNum: number, total?: number) {
  if (sideNum === 1) return "front";
  if (sideNum === 2 && (total ?? 2) >= 2) return "back";
  return `side-${sideNum}`;
}

export async function POST(req: Request) {
  try {
    const { s3, bucket, publicBase } = requireEnv();

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const productId = String(form.get("productId") || "").trim();
    const side = Number(form.get("side") || "1");

    if (!file) return NextResponse.json({ error: "Missing 'file'." }, { status: 400 });
    if (!productId) return NextResponse.json({ error: "Missing 'productId'." }, { status: 400 });
    if (!Number.isFinite(side) || side < 1) {
      return NextResponse.json({ error: "Invalid 'side'." }, { status: 400 });
    }

    const ct = (file.type || "").toLowerCase();
    if (ct !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
    }

    const size = (file as any).size ? Number((file as any).size) : undefined;
    if (size && size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 100MB)." }, { status: 413 });
    }

    const ext = ".pdf";
    const original = sanitize((file as any).name || `artwork${ext}`);
    const uuid = randomUUID();
    const key = `artwork/${sanitize(productId)}/${Date.now()}_${uuid}_side-${side}_${original.endsWith(ext)
      ? original.slice(0, -ext.length)
      : original}${ext}`;

    const ab = await file.arrayBuffer();
    const put = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(ab),
      ContentType: "application/pdf",
      CacheControl: "public, max-age=31536000, immutable",
      // Optional: preserve filename in downloads
      ContentDisposition: `inline; filename="${original}"`,
    });
    await s3.send(put);

    // Cloudflare-proxied public URL (R2 bucket mapped behind your CDN)
    const url = `${publicBase.replace(/\/+$/, "")}/${key.replace(/^artwork\//, "")}`;

    return NextResponse.json(
      {
        ok: true,
        id: key,            // 👈 add id so the client can use it as storageId
        productId,
        side,
        type: sideToType(side),
        key,
        url,                // full CDN URL (handy for immediate previews)
        contentType: "application/pdf",
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}
