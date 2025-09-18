// src/app/api/analytics/guide-download/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { promises as fsp } from "node:fs";
import path from "node:path";

/**
 * Guide Download Analytics (CDN-friendly, Sinalite-aligned)
 *
 * What it does:
 *  - Always logs to server console
 *  - Appends JSONL to /tmp/guide-downloads.jsonl
 *  - Optional: append to GUIDE_ANALYTICS_FILE (absolute path)
 *  - Optional: forward to GUIDE_ANALYTICS_WEBHOOK (HTTP POST)
 *  - Optional: insert into DB when GUIDE_ANALYTICS_USE_DB=1
 *
 * PDFs are served fast via Cloudflare CDN; this endpoint just records click events.
 */

const FILE_TMP = "/tmp/guide-downloads.jsonl";
const FILE_ENV = process.env.GUIDE_ANALYTICS_FILE;    // e.g. /var/data/guide-downloads.jsonl
const WEBHOOK = process.env.GUIDE_ANALYTICS_WEBHOOK;  // e.g. https://hooks.example.com/ingest
const USE_DB = process.env.GUIDE_ANALYTICS_USE_DB === "1";

async function appendJSONL(filePath: string, obj: unknown) {
  try {
    await fsp.mkdir(path.dirname(filePath), { recursive: true }).catch(() => {});
    await fsp.appendFile(filePath, JSON.stringify(obj) + "\n", "utf8");
  } catch {
    // non-blocking
  }
}

/**
 * Optionally insert into your DB via Drizzle.
 * - We **only** try this if GUIDE_ANALYTICS_USE_DB=1
 * - We assume a named export `db` from "@/lib/db"
 * - We assume a named export `guideDownloads` from "@/lib/db/schema/guideDownloads"
 * - All errors are swallowed (analytics must never block UX)
 */
async function tryInsertDb(payload: {
  href: string;
  label: string;
  categoryPath: string;
  sizeBytes: number;
  ts: number;
  referer?: string;
  ua?: string;
  ip?: string;
}) {
  if (!USE_DB) return;

  try {
    // Use `any` to avoid TS complaints if your module shape differs in some envs.
    const dbMod: any = await import("@/lib/db").catch(() => null);
    const db = dbMod?.db || null; // named export is typical in your repo
    if (!db) return;

    const schemaMod: any = await import("@/db/schema/guideDownloads").catch(() => null);
    const guideDownloads = schemaMod?.guideDownloads || null;
    if (!guideDownloads) return;

    await db.insert(guideDownloads).values({
      href: payload.href,
      label: payload.label,
      categoryPath: payload.categoryPath,
      sizeBytes: payload.sizeBytes,
      ts: payload.ts,
      referer: payload.referer || null,
      ua: payload.ua || null,
      ip: payload.ip || null,
      // created_at defaults to now() in schema
    });
  } catch {
    // swallow DB errors; keep request fast and resilient
  }
}

export async function POST(req: Request) {
  try {
    // In Next 15+ route handlers, headers() may be async — await it
    const h = await headers();

    const ua = h.get("user-agent") || "";
    const referer = h.get("referer") || h.get("referrer") || "";
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("cf-connecting-ip") ||
      h.get("x-real-ip") ||
      "";

    const body = (await req.json().catch(() => ({}))) as {
      href?: string;
      label?: string;
      sizeBytes?: number | string;
      categoryPath?: string;
      ts?: number | string;
    };

    const payload = {
      href: body?.href ?? "",
      label: body?.label ?? "",
      sizeBytes: Number(body?.sizeBytes ?? 0),
      categoryPath: body?.categoryPath ?? "",
      ts: Number(body?.ts ?? Date.now()),
      at: new Date().toISOString(),
      ua,
      referer,
      ip,
    };

    // 1) Console log (observable in server logs)
    console.log("[guide-download]", payload);

    // 2) File sinks
    await appendJSONL(FILE_TMP, payload);
    if (FILE_ENV && FILE_ENV.startsWith("/")) {
      await appendJSONL(FILE_ENV, payload);
    }

    // 3) Optional webhook
    if (WEBHOOK) {
      fetch(WEBHOOK, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }

    // 4) Optional DB insert
    await tryInsertDb(payload);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
