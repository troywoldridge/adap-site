// app/api/admin/reviews/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

import { db } from "@/lib/db";
// If your table isn't re-exported by "@/db/schema", import from its concrete file:
// import { productReviews } from "@/db/schema/productReviews";
import { productReviews } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAILS = ["troy.woldridge.1@gmail.com"];

/* helpers */
function isUuidLike(s: unknown): s is string {
  return (
    typeof s === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
  );
}
function toNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) return { ok: false as const, reason: "unauth" };

  const user = await currentUser();
  const emails = user?.emailAddresses?.map((e) => e.emailAddress) ?? [];
  if (!emails.some((e) => ADMIN_EMAILS.includes(e))) {
    return { ok: false as const, reason: "forbid" };
  }
  return { ok: true as const };
}

/* GET: list reviews (optionally filter by productId / rating) */
export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    const status = gate.reason === "unauth" ? 401 : 403;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }

  const { searchParams } = new URL(req.url);
  const productIdParam = searchParams.get("productId");
  const ratingParam = searchParams.get("rating");

  const conditions: any[] = [];

  if (productIdParam !== null && productIdParam !== "") {
    const pid = toNum(productIdParam);
    if (pid !== null) conditions.push(eq(productReviews.productId, pid));
  }
  if (ratingParam !== null && ratingParam !== "") {
    const r = toNum(ratingParam);
    if (r !== null) conditions.push(eq(productReviews.rating, r));
  }

  // Build & execute in one expression so TS doesn't complain about builder reassignments
  const rows = await (
    conditions.length
      ? db
          .select()
          .from(productReviews)
          .where(and(...conditions))
          .orderBy(desc(productReviews.createdAt))
      : db
          .select()
          .from(productReviews)
          .orderBy(desc(productReviews.createdAt))
  );

  return NextResponse.json(rows);
}

/* POST: bulk delete (and optional approve if you add that column later) */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    const status = gate.reason === "unauth" ? 401 : 403;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }

  const body = (await req.json().catch(() => ({}))) as {
    ids?: unknown[];
    action?: string;
  };

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }

  // Your product_reviews.id is UUID (string)
  const idStrs = body.ids.filter(isUuidLike) as string[];
  if (idStrs.length === 0) {
    return NextResponse.json({ error: "ids must be valid UUID strings" }, { status: 400 });
  }

  if (body.action === "delete") {
    await db.delete(productReviews).where(inArray(productReviews.id, idStrs));
    return NextResponse.json({ success: true });
  }

  if (body.action === "approve") {
    // No `approved` column in your schema today. If you add it:
    // await db
    //   .update(productReviews)
    //   .set({ approved: true })
    //   .where(inArray(productReviews.id, idStrs));
    // return NextResponse.json({ success: true });
    return NextResponse.json(
      { error: "approve action not supported (no 'approved' column)" },
      { status: 400 }
    );
  }

  return NextResponse.json({ error: "action must be 'delete' or 'approve'" }, { status: 400 });
}
