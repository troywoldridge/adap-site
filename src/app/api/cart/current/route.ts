// src/app/api/cart/current/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cartLines } from "@/db/schema/cart";
import { eq } from "drizzle-orm";
import { getCartForSession } from "@/lib/cart";
import { cfUrl } from "@/lib/cdn";

/** Try a bunch of shapes to extract a Cloudflare image ID for a product. */
async function getPrimaryImageIdForProduct(productId: number): Promise<string | null> {
  // 1) productImages.json
  try {
    const raw1: unknown = (await import("@/data/productImages.json")).default;
    // Array of rows?
    if (Array.isArray(raw1)) {
      for (const row of raw1 as any[]) {
        const pid = Number(row?.productId ?? row?.product_id ?? row?.id);
        const cf = row?.cloudflare_image_id ?? row?.cloudflare_id ?? row?.imageId ?? row?.image_id;
        if (Number.isFinite(pid) && pid === productId && typeof cf === "string" && cf) return cf;
      }
    }
    // Object map?
    else if (raw1 && typeof raw1 === "object") {
      // If it’s keyed by productId string → { cloudflare_image_id: ... }
      const obj = raw1 as Record<string, any>;
      const byId = obj[String(productId)];
      if (byId) {
        const cf = byId?.cloudflare_image_id ?? byId?.cloudflare_id ?? byId?.imageId ?? byId?.image_id ?? byId;
        if (typeof cf === "string" && cf) return cf;
      }
      // Or values contain rows
      for (const v of Object.values(obj)) {
        const pid = Number((v as any)?.productId ?? (v as any)?.product_id ?? (v as any)?.id);
        const cf = (v as any)?.cloudflare_image_id ?? (v as any)?.cloudflare_id ?? (v as any)?.imageId ?? (v as any)?.image_id;
        if (Number.isFinite(pid) && pid === productId && typeof cf === "string" && cf) return cf;
      }
    }
  } catch {
    /* ignore */
  }

  // 2) imageMap.json
  try {
    const raw2: unknown = (await import("@/data/imageMap.json")).default;
    if (Array.isArray(raw2)) {
      // e.g. [{ product_id, cloudflare_id, ... }]
      for (const row of raw2 as any[]) {
        const pid = Number(row?.productId ?? row?.product_id ?? row?.id);
        const cf = row?.cloudflare_image_id ?? row?.cloudflare_id ?? row?.imageId ?? row?.image_id;
        if (Number.isFinite(pid) && pid === productId && typeof cf === "string" && cf) return cf;
      }
    } else if (raw2 && typeof raw2 === "object") {
      // Record<string,string> where value is imageId
      const obj = raw2 as Record<string, any>;
      const v = obj[String(productId)];
      if (typeof v === "string" && v) return v;
      // Or nested rows
      for (const row of Object.values(obj)) {
        const pid = Number((row as any)?.productId ?? (row as any)?.product_id ?? (row as any)?.id);
        const cf = (row as any)?.cloudflare_image_id ?? (row as any)?.cloudflare_id ?? (row as any)?.imageId ?? (row as any)?.image_id;
        if (Number.isFinite(pid) && pid === productId && typeof cf === "string" && cf) return cf;
      }
    }
  } catch {
    /* ignore */
  }

  // 3) image_table_matched_output.json (if present)
  try {
    const raw3: unknown = (await import("@/data/image_table_matched_output.json")).default;
    if (Array.isArray(raw3)) {
      for (const row of raw3 as any[]) {
        const pid = Number(row?.productId ?? row?.product_id ?? row?.id);
        const cf = row?.cloudflare_image_id ?? row?.cloudflare_id ?? row?.imageId ?? row?.image_id;
        if (Number.isFinite(pid) && pid === productId && typeof cf === "string" && cf) return cf;
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

export async function GET() {
  try {
    const cart = await getCartForSession();
    if (!cart) {
      return NextResponse.json({ ok: true, items: [], subtotal: 0, itemCount: 0, currency: "USD" });
    }

    const lines = await db.select().from(cartLines).where(eq(cartLines.cartId, cart.id));

    let subtotal = 0;
    const items = await Promise.all(
      lines.map(async (l: any) => {
        const qty = Number(l.quantity) || 1;
        const unit = Number(l.unitPrice) || 0;
        const lineTotal = unit * qty;
        subtotal += lineTotal;

        let imageUrl: string | null = null;
        const imgId = await getPrimaryImageIdForProduct(Number(l.productId));
        if (imgId) imageUrl = cfUrl(imgId, "public");

        return {
          id: l.id,
          productId: l.productId,
          name: l.name ?? undefined,  // (optional) if you later join product names
          optionIds: l.optionIds,
          optionsByGroup: l.optionsByGroup,
          sinalitePackageInfo: l.sinalitePackageInfo,
          quantity: qty,
          unitPrice: unit,
          lineTotal,
          currency: "USD",
          image: imageUrl,
          artwork: l.artwork ?? {},
        };
      })
    );

    return NextResponse.json({
      ok: true,
      items,
      subtotal,
      itemCount: items.reduce((n, it) => n + (Number(it.quantity) || 1), 0),
      currency: "USD",
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Failed to load cart" }, { status: 500 });
  }
}
