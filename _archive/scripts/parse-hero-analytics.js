// scripts/parse-hero-analytics.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const DATA_DIR = path.join(process.cwd(), "data");
const LOG_PATH = path.join(DATA_DIR, "hero-analytics.log");

function parseLog() {
  if (!fs.existsSync(LOG_PATH)) {
    console.error("Log file not found:", LOG_PATH);
    process.exit(1);
  }
  const raw = fs.readFileSync(LOG_PATH, "utf-8").trim();
  if (!raw) {
    console.log("Log is empty");
    return [];
  }
  const lines = raw.split("\n");
  const events = lines.map((l) => {
    try {
      return JSON.parse(l);
    } catch (e) {
      console.warn("Skipping malformed line:", l);
      return null;
    }
  }).filter(Boolean);
  return events;
}

function toCSV(events) {
  const header = ["type", "slideId", "ctaText", "timestamp", "receivedAt"];
  const rows = events.map((e) => {
    const type = e.type || "";
    const slideId = e.slideId || "";
    const ctaText = e.ctaText || "";
    const timestamp = e.timestamp || "";
    const receivedAt = e.receivedAt || "";
    return [type, slideId, ctaText, timestamp, receivedAt]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });
  return [header.join(","), ...rows].join("\n");
}

const events = parseLog();
console.log(`Parsed ${events.length} events.`);

// Optionally write JSON
fs.writeFileSync(path.join(DATA_DIR, "hero-analytics.json"), JSON.stringify(events, null, 2));
console.log("Wrote JSON to data/hero-analytics.json");

// Optionally write CSV
fs.writeFileSync(path.join(DATA_DIR, "hero-analytics.csv"), toCSV(events));
console.log("Wrote CSV to data/hero-analytics.csv");
