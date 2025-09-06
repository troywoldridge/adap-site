import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { eq, inArray } from "drizzle-orm";
import Archiver from "archiver";

import { db } from "@/lib/db";
import { orders } from "@/db/schema/orders";
import { cartLines } from "@/db/schema/cartLines";
import { cartArtwork } from "@/db/schema/cartArtwork";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    const jar = await cookies();
    const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? null;

    const [o] = (await db.select().from(orders).where(eq(orders.id, params.id)).limit(1)) ?? [];
    if (!o) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // claim if guest → user
    if (userId && o.userId === sid) {
      await db.update(orders).set({ userId }).where(eq(orders.id, params.id));
      (o as any).userId = userId;
    }
    if (![userId, sid].filter(Boolean).includes(o.userId)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // gather artwork URLs
    const lineRows = o.cartId
      ? await db.select({ id: cartLines.id }).from(cartLines).where(eq(cartLines.cartId, o.cartId as string))
      : [];
    const ids = lineRows.map((l) => l.id);
    const arts = ids.length
      ? await db
          .select({ cartLineId: cartArtwork.cartLineId, url: cartArtwork.url })
          .from(cartArtwork)
          .where(inArray(cartArtwork.cartLineId, ids))
      : [];

    // stream a zip
    const archive = Archiver("zip", { zlib: { level: 9 } });
    const stream = new ReadableStream({
      start(controller) {
        archive.on("data", (chunk) => controller.enqueue(chunk));
        archive.on("end", () => controller.close());
        archive.on("warning", (err) => console.warn("zip warn:", err));
        archive.on("error", (err) => controller.error(err));
      },
      cancel() {
        archive.abort();
      },
    });

    // add each artwork by fetching its URL
    let idx = 1;
    for (const a of arts) {
      try {
        const res = await fetch(a.url, { cache: "no-store" });
        if (!res.ok || !res.body) continue;
        const ext = a.url.split("?")[0].split(".").pop()?.toLowerCase() || "bin";
        const name = `artwork_${String(idx).padStart(2, "0")}.${ext}`;
        // @ts-ignore archiver typings accept streams
        archive.append(res.body, { name });
        idx++;
      } catch (e) {
        // skip failed file
      }
    }

    archive.finalize();

    const filename = `order_${o.orderNumber || o.id.slice(0, 8)}_artwork.zip`;
    return new Response(stream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("artwork.zip failed", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
