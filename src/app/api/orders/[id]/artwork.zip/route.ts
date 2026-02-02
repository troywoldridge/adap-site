import "server-only";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { eq, inArray } from "drizzle-orm";
import archiver from "archiver";
import { Readable } from "node:stream";

import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema/orders";
import { cartLines } from "@/lib/db/schema/cartLines";
import { cartArtwork } from "@/lib/db/schema/cartArtwork";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const database = db;
    const { userId } = await auth();

    const jar = await cookies();
    const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? null;

    const [o] = await database
      .select()
      .from(orders)
      .where(eq(orders.id, params.id))
      .limit(1);

    if (!o) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    if (userId && o.userId === sid) {
      await database
        .update(orders)
        .set({ userId })
        .where(eq(orders.id, params.id));
      (o as any).userId = userId;
    }

    if (![userId, sid].filter(Boolean).includes(o.userId)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const lineRows = o.cartId
      ? await database
          .select({ id: cartLines.id })
          .from(cartLines)
          .where(eq(cartLines.cartId, o.cartId as string))
      : [];

    const ids = lineRows.map((l) => l.id);

    const arts =
      ids.length > 0
        ? await database
            .select({
              cartLineId: cartArtwork.cartLineId,
              url: cartArtwork.url,
            })
            .from(cartArtwork)
            .where(inArray(cartArtwork.cartLineId, ids))
        : [];

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("warning", (err: Error & { code?: string }) => {
      if ((err as any).code === "ENOENT") {
        console.warn("zip warning:", err.message);
      } else {
        throw err;
      }
    });

    archive.on("error", (err: Error) => {
      throw err;
    });

    let idx = 1;
    for (const a of arts) {
      try {
        const res = await fetch(a.url, { cache: "no-store" });
        if (!res.ok || !res.body) continue;

        const ext =
          a.url.split("?")[0].split(".").pop()?.toLowerCase() || "bin";
        const name = `artwork_${String(idx).padStart(2, "0")}.${ext}`;

        const nodeReadable = Readable.fromWeb(res.body as any);
        archive.append(nodeReadable, { name });
        idx++;
      } catch (e) {
        console.warn("skipping artwork due to fetch/stream error:", e);
      }
    }

    void archive.finalize();

    const filename = `order_${(o as any).orderNumber || String(o.id).slice(0, 8)}_artwork.zip`;
    const webStream = Readable.toWeb(archive) as unknown as ReadableStream<Uint8Array>;

    return new Response(webStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("artwork.zip failed", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 },
    );
  }
}
