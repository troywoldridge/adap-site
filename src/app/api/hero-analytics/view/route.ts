// src/app/api/hero-analytics/view/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type Event = {
  type: "impression" | "click";
  slideId: string;
  timestamp: number;
  ctaText?: string;
  receivedAt: string;
};

function loadEvents(): Event[] {
  const logPath = path.join(process.cwd(), "data", "hero-analytics.log");
  try {
    if (!fs.existsSync(logPath)) return [];
    const raw = fs.readFileSync(logPath, "utf-8").trim();
    if (!raw) return [];
    return raw
      .split("\n")
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Event[];
  } catch (e) {
    console.warn("Error reading analytics log:", e);
    return [];
  }
}

export function GET(_req: NextRequest) {
  const events = loadEvents();
  return NextResponse.json({ events });
}
