import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { orderArtwork } from "@/db/schema";

function bad(status: number, msg: string) {
  return NextResponse.json({ error: msg }, { status });
}

type IncomingFile = {
  publicUrl: string;
  filename: string;
  contentType: string;
  storageKey: string;
  bucket: string;
  sideIndex?: number;
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return bad(401, "Unauthorized");

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return bad(400, "Invalid JSON");
  }

  const {
    orderSessionId,
    orderId,           // may be undefined while in checkout
    orderItemId,       // may be undefined
    productId,
    files,
    sinaliteJobId,
  } = body || {};

  if (!orderSessionId) return bad(400, "orderSessionId is required");
  if (!productId) return bad(400, "productId is required");
  if (!Array.isArray(files) || files.length === 0) return bad(400, "files[] is required");

  const productIdNum = Number(productId);
  if (!Number.isFinite(productIdNum)) return bad(400, "productId must be a number");

  const orderIdNum =
    orderId != null && orderId !== "" && Number.isFinite(Number(orderId))
      ? Number(orderId)
      : undefined;

  const orderItemIdNum =
    orderItemId != null && orderItemId !== "" && Number.isFinite(Number(orderItemId))
      ? Number(orderItemId)
      : undefined;

  // Build rows as the exact insert type for this table
  const rows: typeof orderArtwork.$inferInsert[] = (files as IncomingFile[]).map((f, i) => {
    const sideIndex = typeof f.sideIndex === "number" ? f.sideIndex : i;

    return {
      orderSessionId: String(orderSessionId),
      // only set when present (schema now allows them to be undefined)
      ...(orderIdNum !== undefined ? { orderId: orderIdNum } : {}),
      ...(orderItemIdNum !== undefined ? { orderItemId: orderItemIdNum } : {}),

      productId: productIdNum,
      sideIndex,
      filename: String(f.filename),
      contentType: String(f.contentType || "application/octet-stream"),
      storageKey: String(f.storageKey),
      bucket: String(f.bucket),
      publicUrl: String(f.publicUrl),
      sinaliteJobId: (sinaliteJobId ?? null) as string | null,
      sinaliteAssetId: null,
    };
  });

  const inserted = await db.insert(orderArtwork).values(rows).returning({
    id: orderArtwork.id,
    sideIndex: orderArtwork.sideIndex,
  });

  // Optional SinaLite push per the Sinalite API docs
  let sinaliteResult: { skipped: boolean; pushed?: number; error?: string } = { skipped: true };
  try {
    if (process.env.ENABLE_SINALITE_SYNC === "true" && sinaliteJobId) {
      const mod = await import("@/lib/sinalite").catch(() => null as any);
      const pushFn = mod?.pushArtworkToSinaLite as
        | (undefined | ((args: { jobId: string; files: { url: string; filename: string; contentType: string; sideIndex: number }[] }) => Promise<any>));
      if (typeof pushFn === "function") {
        await pushFn({
          jobId: String(sinaliteJobId),
          files: rows.map((r) => ({
            url: String(r.publicUrl),
            filename: String(r.filename),
            contentType: String(r.contentType),
            sideIndex: Number(r.sideIndex),
          })),
        });
        sinaliteResult = { skipped: false, pushed: rows.length };
      }
    }
  } catch (e: any) {
    console.error("[attach-artwork] SinaLite push failed:", e?.message || e);
    sinaliteResult = { skipped: false, error: e?.message || "push failed" };
  }

  return NextResponse.json({
    ok: true,
    inserted: inserted.length,
    rows: inserted,
    sinalite: sinaliteResult,
  });
}
