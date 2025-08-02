// src/app/api/hero-analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const LOG_PATH = path.join(process.cwd(), "data", "hero-analytics.log");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.events || !Array.isArray(body.events)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Append in newline-delimited JSON for simplicity
    const lines = body.events.map((e: any) => JSON.stringify({ ...e, receivedAt: new Date().toISOString() }));
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, lines.map((l: string) => l + "\n").join(""));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Analytics ingest error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
