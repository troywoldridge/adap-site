// src/app/api/uploads/put/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.startsWith("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const uploadUrl = form.get("uploadUrl");
    const contentType = String(form.get("contentType") || "application/octet-stream");

    if (!(file instanceof Blob) || typeof uploadUrl !== "string" || !uploadUrl) {
      return NextResponse.json({ error: "Invalid form fields" }, { status: 400 });
    }

    // Stream bytes to Cloudflare R2 signed URL
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": contentType },
      body: file, // Blob/stream
      // IMPORTANT: choose ONE cache directive
      cache: "no-store",
    });

    if (!putRes.ok) {
      const t = await putRes.text().catch(() => "");
      return NextResponse.json(
        { error: `R2 upload failed (${putRes.status})`, details: t?.slice(0, 300) },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload proxy failed" }, { status: 500 });
  }
}
