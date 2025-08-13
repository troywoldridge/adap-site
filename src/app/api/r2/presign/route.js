// src/app/api/r2/presign/route.js
import { NextResponse } from "next/server";
import { R2, R2_BUCKET, R2_PUBLIC_BASEURL } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Basic filename sanitization
function safeName(name = "") {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 200);
}

export async function POST(req) {
  try {
    const { filename, contentType, orderId } = await req.json();

    if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 });
    if (!orderId)  return NextResponse.json({ error: "orderId required" }, { status: 400 });

    const clean = safeName(filename);
    const key = `artwork/${encodeURIComponent(String(orderId))}/${Date.now()}-${clean}`;

    const cmd = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType || "application/octet-stream",
      // Optional: server-side integrity headers if you compute on client
      // ChecksumSHA256: "<base64_sha256>",
      // ACL: "public-read" // not needed; public access controlled at edge URL
    });

    const uploadUrl = await getSignedUrl(R2, cmd, { expiresIn: 60 * 10 }); // 10 minutes

    // Public URL (reading) via your chosen base
    const publicUrl = `${R2_PUBLIC_BASEURL}/${encodeURI(key)}`;

    return NextResponse.json({ uploadUrl, key, publicUrl }, { status: 200 });
  } catch (err) {
    console.error("R2 presign error:", err);
    return NextResponse.json({ error: "Failed to create presigned URL" }, { status: 500 });
  }
}

// Optional: method guard
export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}
