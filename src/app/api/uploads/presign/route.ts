import "server-only";
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ───────── JSON helper ───────── */
function j(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

/* ───────── ENV (Cloudflare R2) ─────────
   PUBLIC URL should be your CDN in front of R2 origin, e.g. https://uploads.example.com/
*/
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;
const R2_PUBLIC_BASEURL =
  process.env.R2_PUBLIC_BASEURL ?? process.env.R2_PUBLIC_BASE_URL ?? "";

/* ───────── S3 client (R2) ───────── */
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/* ───────── utils ───────── */
function cleanName(n?: string | null) {
  return (n ?? "").toString().trim().replace(/[/\\]+/g, "-");
}
function extOf(name: string) {
  const m = /\.[^.]+$/.exec(name || "");
  return (m ? m[0] : "").toLowerCase();
}
function publicUrlFor(key: string) {
  if (!R2_PUBLIC_BASEURL) return "";
  const base = R2_PUBLIC_BASEURL.endsWith("/")
    ? R2_PUBLIC_BASEURL
    : R2_PUBLIC_BASEURL + "/";
  return new URL(key.replace(/^\/+/, ""), base).toString();
}

/* ───────── POST /api/uploads/presign ───────── */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as any;
    // Handy to verify what's arriving in dev:
    console.log("[uploads/presign] body:", body);

    // Liberal alias handling
    const filenameRaw =
      body?.fileName ?? body?.filename ?? body?.name ?? "";
    const contentTypeRaw =
      body?.contentType ?? body?.content_type ?? body?.mime ?? body?.type ?? "";

    // Clean filename; if absent, synthesize one
    let filename = cleanName(filenameRaw);
    if (!filename) filename = `upload-${crypto.randomUUID()}`;

    // Ensure we have a contentType; if not, derive from extension (fallback to octet-stream)
    let contentType = String(contentTypeRaw || "").trim();
    const derivedExt = body?.ext && String(body.ext).startsWith(".") ? String(body.ext) : extOf(filename);
    if (!contentType) {
      // minimal map; extend if you need more
      const map: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".tif": "image/tiff",
        ".tiff": "image/tiff",
        ".pdf": "application/pdf",
        ".ai": "application/postscript",
        ".eps": "application/postscript",
        ".psd": "image/vnd.adobe.photoshop",
      };
      contentType = map[derivedExt] || "application/octet-stream";
    }

    // ✅ Do NOT 400 on naming differences anymore
    // if (!filename || !contentType) { return j({ ok: false, error: "filename and contentType required" }, 400); }

    const meta = (body?.meta && typeof body.meta === "object") ? body.meta : {};
    const isThumb = String(meta.kind || "").toLowerCase() === "thumb";

    // Key layout: artwork/ or thumbs/ (Cloudflare CDN friendly)
    const folder = isThumb ? "thumbs" : "artwork";
    const key = `${folder}/${crypto.randomUUID()}${derivedExt || ""}`;

    // Presign PUT to R2
    const cmd = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 15 * 60 });

    const publicUrl = publicUrlFor(key);

    return j({
      ok: true,
      key,
      uploadUrl,
      publicUrl,     // served via your Cloudflare CDN in front of R2
      contentType,
    });
  } catch (err: any) {
    console.error("[uploads/presign] error:", err?.message, err?.stack);
    return j({ ok: false, error: err?.message || "presign failed" }, 500);
  }
}
