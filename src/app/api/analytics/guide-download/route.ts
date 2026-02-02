// src/app/api/analytics/guide-download/route.ts
import "server-only";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";


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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const FILE_TMP = "/tmp/guide-downloads.jsonl";
const FILE_ENV = process.env.GUIDE_ANALYTICS_FILE; // e.g. /var/data/guide-downloads.jsonl
const WEBHOOK = process.env.GUIDE_ANALYTICS_WEBHOOK; // e.g. https://hooks.example.com/ingest
const USE_DB = process.env.GUIDE_ANALYTICS_USE_DB === "1";

async function appendJSONL(filePath: string, obj: unknown) {
  try {
    await fsp.mkdir(path.dirname(filePath), { recursive: true }).catch(() => {});
    await fsp.appendFile(filePath, JSON.stringify(obj) + "\n", "utf8");
  } catch {
    // non-blocking
  }
}

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
    const dbMod: any = await import("@/lib/db").catch(() => null);
    const getDb = dbMod?.db || null; // in this repo db is a function
    if (typeof getDb !== "function") return;

    const schemaMod: any = await import("@/lib/db/schema/guideDownloads").catch(() => null);
    const guideDownloads = schemaMod?.guideDownloads || null;
    if (!guideDownloads) return;

    const { insert } = db;

    await insert(guideDownloads).values({
      href: payload.href,
      label: payload.label,
      categoryPath: payload.categoryPath,
      sizeBytes: payload.sizeBytes,
      ts: payload.ts,
      referer: payload.referer || null,
      ua: payload.ua || null,
      ip: payload.ip || null,
    });
  } catch {
    // swallow DB errors; keep request fast and resilient
  }
}

export async function POST(req: Request) {
  try {
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

    console.log("[guide-download]", payload);

    await appendJSONL(FILE_TMP, payload);
    if (FILE_ENV && FILE_ENV.startsWith("/")) {
      await appendJSONL(FILE_ENV, payload);
    }

    if (WEBHOOK) {
      fetch(WEBHOOK, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }

    await tryInsertDb(payload);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
