// src/app/api/hero-analytics/view/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export type Event = {
  type: "impression" | "click" | "category_impression" | "category_click" | string;
  slideId?: string;
  itemId?: string; // for category events
  timestamp: number;
  ctaText?: string;
  receivedAt: string;
};

const LOG_PATH = path.join(process.cwd(), "data", "hero-analytics.log");

function safeParseLine(line: string): Event | null {
  try {
    const parsed = JSON.parse(line);
    if (typeof parsed !== "object" || parsed === null) return null;
    // Ensure required fields exist with fallbacks
    const event: Event = {
      type: parsed.type || "unknown",
      timestamp: typeof parsed.timestamp === "number" ? parsed.timestamp : Date.now(),
      receivedAt: parsed.receivedAt || new Date().toISOString(),
      slideId: typeof parsed.slideId === "string" ? parsed.slideId : undefined,
      itemId: typeof parsed.itemId === "string" ? parsed.itemId : undefined,
      ctaText: typeof parsed.ctaText === "string" ? parsed.ctaText : undefined,
    };
    return event;
  } catch {
    return null;
  }
}

function loadEvents(): Event[] {
  try {
    if (!fs.existsSync(LOG_PATH)) return [];
    const raw = fs.readFileSync(LOG_PATH, "utf-8").trim();
    if (!raw) return [];
    const lines = raw.split("\n");
    const events = lines
      .map(safeParseLine)
      .filter(Boolean) as Event[];
    // sort newest first by receivedAt or timestamp
    events.sort((a, b) => {
      const ta = new Date(a.receivedAt).getTime() || a.timestamp;
      const tb = new Date(b.receivedAt).getTime() || b.timestamp;
      return tb - ta;
    });
    return events;
  } catch (e) {
    console.warn("Failed to load hero analytics log:", e);
    return [];
  }
}

export function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  let events = loadEvents();
  if (limitParam) {
    const n = parseInt(limitParam, 10);
    if (!isNaN(n) && n > 0) {
      events = events.slice(0, n);
    }
  }
  return NextResponse.json({ events });
}
