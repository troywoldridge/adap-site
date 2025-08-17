import "server-only";
import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_BASE = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
const PREFIX = (process.env.R2_UPLOAD_PREFIX || "uploads").replace(/^\/+|\/+$/g, "");
const EXPIRES = Number(process.env.R2_PRESIGN_EXPIRES_SECONDS || 900);

// R2 uses region "auto" + account endpoint
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
});

export async function POST(req: Request) {
  try {
    const { filename, contentType, lineId, side } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: "filename and contentType required" }, { status: 400 });
    }

    const safeName = String(filename).replace(/[^\w.\-()+ ]+/g, "_");
    const key = `${PREFIX}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    // IMPORTANT: include ContentType in the command so the signature expects it
    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      // (Optional) you can add CacheControl, Metadata, etc.
      // CacheControl: "private, max-age=31536000, immutable",
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: EXPIRES });
    const publicUrl = PUBLIC_BASE ? `${PUBLIC_BASE}/${key}` : uploadUrl; // fallback

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "presign failed" }, { status: 500 });
  }
}
