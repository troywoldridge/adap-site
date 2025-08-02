// server component
import fs from "fs";
import path from "path";
import AnalyticsViewer from '@/app/admin/analytics/AnalyticsViewer';


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
    if (!fs.existsSync(logPath)) {
      return [];
    }
    const raw = fs.readFileSync(logPath, "utf-8").trim();
    if (!raw) {
      return [];
    }
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
    console.warn("Failed to read analytics log:", e);
    return [];
  }
}

export default function AnalyticsPage() {
  const events = loadEvents();
  return (
    <div style={{ padding: 24, fontFamily: "system-ui,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <h1>Hero Slide Analytics</h1>
      <p>Total events collected: {events.length}</p>
      <AnalyticsViewer initialEvents={events} />
    </div>
  );
}
