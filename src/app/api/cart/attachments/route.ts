// src/app/api/cart/attachments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cartAttachments } from "@/db/schema/cartAttachments";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type CartLine = { lineId: string; quantity?: number };
type Part = { storageId: string; fileName: string };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const productIdRaw = body?.productId;
    const cartLines = body?.cartLines as CartLine[] | undefined;
    const parts = body?.parts as Part[] | undefined;

    const productId = Number(productIdRaw);
    if (!Number.isFinite(productId)) {
      return NextResponse.json({ ok: false, error: "productId is required (number)" }, { status: 400 });
    }
    if (!Array.isArray(cartLines) || cartLines.length === 0) {
      return NextResponse.json({ ok: false, error: "cartLines are required" }, { status: 400 });
    }
    if (!Array.isArray(parts) || parts.length === 0) {
      return NextResponse.json({ ok: false, error: "parts are required" }, { status: 400 });
    }

    // Normalize/validate
    const cleanLines = cartLines
      .map((l) => ({ lineId: String(l.lineId).trim() }))
      .filter((l) => isNonEmptyString(l.lineId));

    const cleanParts = parts
      .map((p) => ({ storageId: String(p.storageId).trim(), fileName: String(p.fileName || "").trim() }))
      .filter((p) => isNonEmptyString(p.storageId) && isNonEmptyString(p.fileName));

    if (cleanLines.length === 0) {
      return NextResponse.json({ ok: false, error: "No valid cart line IDs provided" }, { status: 400 });
    }
    if (cleanParts.length === 0) {
      return NextResponse.json({ ok: false, error: "No valid parts provided" }, { status: 400 });
    }

    // De-dupe input on (lineId, storageId)
    const seen = new Set<string>();
    const values = cleanLines.flatMap((l) =>
      cleanParts.map((p) => {
        const key = `${l.lineId}::${p.storageId}`;
        if (seen.has(key)) return null;
        seen.add(key);
        return {
          lineId: l.lineId,
          productId,
          storageId: p.storageId,
          fileName: p.fileName,
        };
      })
    ).filter(Boolean) as Array<{
      lineId: string;
      productId: number;
      storageId: string;
      fileName: string;
    }>;

    if (values.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0, skipped: 0 });
    }

    // Insert with ON CONFLICT DO NOTHING (unique on lineId+storageId)
    const inserted = await db
      .insert(cartAttachments)
      .values(values)
      .onConflictDoNothing({ target: [cartAttachments.lineId, cartAttachments.storageId] })
      .returning({ id: cartAttachments.id });

    // Optional: clean up any historical duplicates that might pre-exist
    // (keeps the lowest id, deletes the rest)
    await db.execute(sql`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY line_id, storage_id ORDER BY id) AS rn
        FROM cart_attachments
      )
      DELETE FROM cart_attachments
      WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    `);

    return NextResponse.json({
      ok: true,
      inserted: inserted.length,
      attempted: values.length,
      skipped: values.length - inserted.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to save attachments" },
      { status: 500 }
    );
  }
}
