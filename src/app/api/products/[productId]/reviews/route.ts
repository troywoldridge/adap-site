// src/app/api/products/[productId]/reviews/route.ts
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { dbClient as db } from "@/lib/db";
import { productReviews, reviewHelpfulVotes } from "@/db/schema/reviews";
import { and, or, eq, inArray, sql, desc, asc } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_PAGE_SIZE = 50;
const MAX_NAME = 60;
const MAX_EMAIL = 80;
const MAX_COMMENT = 2000;

function getClientIp(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xr = h.get("x-real-ip");
  if (xr) return xr.trim();
  return "0.0.0.0";
}
function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function toIso(d: unknown): string {
  return d instanceof Date ? d.toISOString() : String(d ?? "");
}

/* -------------------------------- GET --------------------------------
   Cursor pagination for sort=newest|oldest using (createdAt,id) tiebreaker.
   For sort=helpful/highest/lowest we keep page/pageSize ordering (stable).
--------------------------------------------------------------------------- */
export async function GET(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const productId = (params.productId || "").trim();
    if (!productId) return NextResponse.json({ ok: false, error: "invalid_product_id" }, { status: 400 });

    const url = new URL(req.url);
    const sort = (url.searchParams.get("sort") || "newest").toLowerCase();
    const suppliedFp = (url.searchParams.get("fingerprint") || "").slice(0, 64);

    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(url.searchParams.get("pageSize") || "10")));

    // cursor params (for newest/oldest)
    const cursorB64 = url.searchParams.get("cursor") || "";
    const dir = (url.searchParams.get("dir") || "next").toLowerCase(); // next|prev
    let cursor: null | { t: string; id: number } = null;
    if (cursorB64) {
      try {
        cursor = JSON.parse(Buffer.from(cursorB64, "base64").toString("utf8"));
      } catch {}
    }

    const baseWhere = and(eq(productReviews.productId, productId), eq(productReviews.approved, true));

    // total (for UX, even when using cursors)
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(productReviews)
      .where(baseWhere);

    // helpful count subselect
    const helpfulExpr = sql<number>`
      (select count(*)::int
         from review_helpful_votes v
        where v.review_id = ${productReviews.id}
          and v.is_helpful = true)
    `;

    // If sort supports cursors:
    const cursorable = sort === "newest" || sort === "oldest";

    if (cursorable) {
      // Build order & optional cursor clause
      const orderNewest = [desc(productReviews.createdAt), desc(productReviews.id)] as const;
      const orderOldest = [asc(productReviews.createdAt), asc(productReviews.id)] as const;
      const orderExpr = sort === "newest" ? orderNewest : orderOldest;

      let whereExpr: any = baseWhere;
      if (cursor) {
        // emulate tuple compare using boolean expression
        const t = cursor.t;
        const id = cursor.id;

        if (sort === "newest") {
          // next => (createdAt,id) < (t,id)
          // prev => (createdAt,id) > (t,id)
          if (dir === "prev") {
            whereExpr = and(
              baseWhere,
              sql`( ${productReviews.createdAt} > ${t} OR (${productReviews.createdAt} = ${t} AND ${productReviews.id} > ${id}) )`
            );
          } else {
            whereExpr = and(
              baseWhere,
              sql`( ${productReviews.createdAt} < ${t} OR (${productReviews.createdAt} = ${t} AND ${productReviews.id} < ${id}) )`
            );
          }
        } else {
          // oldest (ascending)
          if (dir === "prev") {
            whereExpr = and(
              baseWhere,
              sql`( ${productReviews.createdAt} < ${t} OR (${productReviews.createdAt} = ${t} AND ${productReviews.id} < ${id}) )`
            );
          } else {
            whereExpr = and(
              baseWhere,
              sql`( ${productReviews.createdAt} > ${t} OR (${productReviews.createdAt} = ${t} AND ${productReviews.id} > ${id}) )`
            );
          }
        }
      }

      // fetch a page (always forward order for consistent cursors)
      const rows = await db
        .select({
          id: productReviews.id,
          name: productReviews.name,
          rating: productReviews.rating,
          comment: productReviews.comment,
          createdAt: productReviews.createdAt,
          verified: productReviews.verified,
          helpfulCount: helpfulExpr,
        })
        .from(productReviews)
        .where(whereExpr)
        .orderBy(...orderExpr)
        .limit(pageSize);

      // my vote detection
      const { userId } = await auth();
      let fingerprint = suppliedFp;
      if (!fingerprint) {
        const ip = getClientIp(req.headers);
        const ua = req.headers.get("user-agent") ?? "";
        fingerprint = crypto.createHash("sha256").update(`${ip}::${ua}`).digest("hex").slice(0, 64);
      }

      const ids = rows.map((r) => r.id);
      let votedMap: Record<number, boolean> = {};
      if (ids.length) {
        let voterCond: any;
        if (userId && fingerprint) {
          voterCond = or(eq(reviewHelpfulVotes.userId, userId), eq(reviewHelpfulVotes.voterFingerprint, fingerprint));
        } else if (userId) {
          voterCond = eq(reviewHelpfulVotes.userId, userId);
        } else if (fingerprint) {
          voterCond = eq(reviewHelpfulVotes.voterFingerprint, fingerprint);
        }

        if (voterCond) {
          const votedRows = await db
            .select({ reviewId: reviewHelpfulVotes.reviewId })
            .from(reviewHelpfulVotes)
            .where(and(inArray(reviewHelpfulVotes.reviewId, ids), eq(reviewHelpfulVotes.isHelpful, true), voterCond));
          for (const vr of votedRows) votedMap[vr.reviewId] = true;
        }
      }

      const items = rows.map((r) => ({
        id: r.id,
        name: r.name,
        rating: r.rating,
        comment: r.comment,
        createdAt: toIso(r.createdAt),
        verified: r.verified,
        helpfulCount: r.helpfulCount ?? 0,
        votedByMe: !!votedMap[r.id],
      }));

      // cursors: from first/last row
      const first = rows[0];
      const last = rows[rows.length - 1];
      const encode = (r: typeof first | undefined) =>
        r ? Buffer.from(JSON.stringify({ t: toIso(r.createdAt), id: r.id }), "utf8").toString("base64") : null;

      const nextCursor = encode(last);
      const prevCursor = encode(first);

      return NextResponse.json({
        ok: true,
        productId,
        total,
        sort,
        cursor: nextCursor, // pass ?cursor=<this>&dir=next to get the next page
        prevCursor,         // pass ?cursor=<this>&dir=prev to page backward
        pageSize,
        items,
      });
    }

    // Fallback: page/pageSize for complex sorts (helpful/highest/lowest)
    let orderExpr: any;
    switch (sort) {
      case "helpful":
      case "most_helpful":
        orderExpr = desc(helpfulExpr);
        break;
      case "highest":
      case "rating":
      case "rating_desc":
        orderExpr = desc(productReviews.rating);
        break;
      case "lowest":
      case "rating_asc":
        orderExpr = asc(productReviews.rating);
        break;
      case "oldest":
        orderExpr = asc(productReviews.createdAt);
        break;
      default:
        orderExpr = desc(productReviews.createdAt);
        break;
    }
    const offset = (page - 1) * pageSize;

    const rows = await db
      .select({
        id: productReviews.id,
        name: productReviews.name,
        rating: productReviews.rating,
        comment: productReviews.comment,
        createdAt: productReviews.createdAt,
        verified: productReviews.verified,
        helpfulCount: helpfulExpr,
      })
      .from(productReviews)
      .where(baseWhere)
      .orderBy(orderExpr, desc(productReviews.id))
      .limit(pageSize)
      .offset(offset);

    // my vote check (same as above)
    const { userId } = await auth();
    let fingerprint = suppliedFp;
    if (!fingerprint) {
      const ip = getClientIp(req.headers);
      const ua = req.headers.get("user-agent") ?? "";
      fingerprint = crypto.createHash("sha256").update(`${ip}::${ua}`).digest("hex").slice(0, 64);
    }
    const ids = rows.map((r) => r.id);
    let votedMap: Record<number, boolean> = {};
    if (ids.length) {
      let voterCond: any;
      if (userId && fingerprint) {
        voterCond = or(eq(reviewHelpfulVotes.userId, userId), eq(reviewHelpfulVotes.voterFingerprint, fingerprint));
      } else if (userId) {
        voterCond = eq(reviewHelpfulVotes.userId, userId);
      } else if (fingerprint) {
        voterCond = eq(reviewHelpfulVotes.voterFingerprint, fingerprint);
      }
      if (voterCond) {
        const votedRows = await db
          .select({ reviewId: reviewHelpfulVotes.reviewId })
          .from(reviewHelpfulVotes)
          .where(and(inArray(reviewHelpfulVotes.reviewId, ids), eq(reviewHelpfulVotes.isHelpful, true), voterCond));
        for (const vr of votedRows) votedMap[vr.reviewId] = true;
      }
    }

    const items = rows.map((r) => ({
      id: r.id,
      name: r.name,
      rating: r.rating,
      comment: r.comment,
      createdAt: toIso(r.createdAt),
      verified: r.verified,
      helpfulCount: r.helpfulCount ?? 0,
      votedByMe: !!votedMap[r.id],
    }));

    return NextResponse.json({
      ok: true,
      productId,
      total,
      sort,
      page,
      pageSize,
      items,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}

/* -------------------------------- POST --------------------------------
   Submit review with Cloudflare Turnstile verification + rate limits.
--------------------------------------------------------------------------- */
export async function POST(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const productId = (params.productId || "").trim();
    if (!productId) return NextResponse.json({ ok: false, error: "invalid_product_id" }, { status: 400 });

    const ip = getClientIp(req.headers);
    const { userId } = await auth(); // optional for “verified buyer” future

    const body = await req.json().catch(() => ({}));
    let { name, email, rating, comment, termsAgreed, turnstileToken, website } = body ?? {};
    // Honeypot (bots often fill this)
    if (website) return NextResponse.json({ ok: false, error: "spam_detected" }, { status: 400 });

    // ---- Cloudflare Turnstile verify (server-side) ----
    const token = (turnstileToken ?? req.headers.get("cf-turnstile-response") ?? "").toString();
    const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET || "";
    if (!secret) {
      console.warn("Turnstile secret not set; set CLOUDFLARE_TURNSTILE_SECRET for production protection.");
    } else {
      if (!token) return NextResponse.json({ ok: false, error: "turnstile_required" }, { status: 400 });

      const form = new URLSearchParams();
      form.append("secret", secret);
      form.append("response", token);
      form.append("remoteip", ip);

      const tsRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: form,
      });
      const data = (await tsRes.json()) as { success?: boolean; ["error-codes"]?: string[] };

      if (!data?.success) {
        return NextResponse.json(
          { ok: false, error: "turnstile_failed", details: data?.["error-codes"] || [] },
          { status: 403 }
        );
      }
    }

    // Normalize + validate
    name = (name ?? "").toString().trim();
    email = (email ?? "").toString().trim();
    comment = (comment ?? "").toString().trim();
    rating = Number(rating);

    if (name.length < 2 || name.length > MAX_NAME) {
      return NextResponse.json({ ok: false, error: "invalid_name" }, { status: 400 });
    }
    if (email && (!isEmail(email) || email.length > MAX_EMAIL)) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ ok: false, error: "invalid_rating" }, { status: 400 });
    }
    if (comment.length < 5 || comment.length > MAX_COMMENT) {
      return NextResponse.json({ ok: false, error: "invalid_comment" }, { status: 400 });
    }
    if (termsAgreed !== true) {
      return NextResponse.json({ ok: false, error: "terms_required" }, { status: 400 });
    }

    // Rate limit: one submission per product+IP within 8h
    const [{ recent }] =
      (await db
        .select({ recent: sql<number>`count(*)::int` })
        .from(productReviews)
        .where(and(eq(productReviews.productId, productId), eq(productReviews.userIp, ip), sql`product_reviews.created_at > NOW() - INTERVAL '8 hours'`))) ??
      [{ recent: 0 }];
    if (recent > 0) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    // Duplicate guard: same text within 7d on same product
    const [{ dup }] =
      (await db
        .select({ dup: sql<number>`count(*)::int` })
        .from(productReviews)
        .where(
          and(
            eq(productReviews.productId, productId),
            sql`product_reviews.created_at > NOW() - INTERVAL '7 days'`,
            sql`md5(${productReviews.comment}) = md5(${comment})`
          )
        )) ?? [{ dup: 0 }];
    if (dup > 0) {
      return NextResponse.json({ ok: false, error: "duplicate_content" }, { status: 409 });
    }

    const approvedFlag = process.env.REVIEWS_AUTO_APPROVE === "true";

    const [row] = await db
      .insert(productReviews)
      .values({
        productId,
        name,
        email: email || null,
        rating,
        comment,
        approved: approvedFlag,
        userIp: ip,
        termsAgreed: true,
        verified: false,
      })
      .returning({
        id: productReviews.id,
        createdAt: productReviews.createdAt,
        approved: productReviews.approved,
        verified: productReviews.verified,
      });

    return NextResponse.json(
      {
        ok: true,
        productId,
        review: {
          id: row.id,
          createdAt: toIso(row.createdAt),
          approved: row.approved,
          verified: row.verified,
        },
        moderation: approvedFlag ? "approved" : "pending",
      },
      { status: approvedFlag ? 201 : 202 }
    );
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
