import { NextResponse } from "next/server";

const PUBLIC_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE!; // e.g. https://cdn.yourdomain.com
// implement your own presign-to-R2 here; mocked for brevity

export async function POST(req: Request) {
  const { lineId, side, ext } = await req.json();
  if (!lineId || !side) return NextResponse.json({ error: "Missing lineId/side" }, { status: 400 });

  const key = `cart/${lineId}/side-${side}-${Date.now()}.${ext || "jpg"}`;

  // TODO: actually presign with R2; here we mock:
  const url = `https://r2-upload-presigned.example/put/${encodeURIComponent(key)}`;

  const publicUrl = `${PUBLIC_BASE}/${key}`;
  return NextResponse.json({ url, key, publicUrl });
}
