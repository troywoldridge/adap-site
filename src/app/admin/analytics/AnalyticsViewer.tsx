"use client";

import { useEffect, useState, useMemo, useCallback } from "react";

export type Event = {
  type: "impression" | "click" | "category_impression" | "category_click";
  slideId?: string; // for slides
  itemId?: string; // for categories
  timestamp: number;
  ctaText?: string;
  receivedAt: string;
};

interface Props {
  initialEvents: Event[];
}

type SummaryEntry = {
  impressions: number;
  clicks: number;
  ctr: number; // fraction
  recent: Event[]; // last N events for sparkline
  label: string; // human readable (slide or category)
  kind: "slide" | "category";
};

type Summary = Record<string, SummaryEntry>; // key is composite: kind|id

function aggregate(events: Event[], recentLimit = 50): Summary {
  const buckets: Record<string, { impressions: number; clicks: number; raw: Event[]; label: string; kind: "slide" | "category" }> = {};

  for (const ev of events) {
    const isCategory = ev.type.startsWith("category");
    const id = isCategory ? ev.itemId! : ev.slideId!;
    const kind = isCategory ? "category" : "slide";
    const key = `${kind}|${id}`;

    if (!buckets[key]) {
      buckets[key] = {
        impressions: 0,
        clicks: 0,
        raw: [],
        label: id,
        kind,
      };
    }
    if (ev.type === "impression" || ev.type === "category_impression") buckets[key].impressions += 1;
    if (ev.type === "click" || ev.type === "category_click") buckets[key].clicks += 1;
    buckets[key].raw.push(ev);
  }

  const summary: Summary = {};
  for (const [key, { impressions, clicks, raw, label, kind }] of Object.entries(buckets)) {
    const ctr = impressions ? clicks / impressions : 0;
    const recent = raw
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-recentLimit);
    summary[key] = { impressions, clicks, ctr, recent, label, kind };
  }
  return summary;
}

function Sparkline({
  events,
  width = 120,
  height = 24,
}: {
  events: Event[];
  width?: number;
  height?: number;
}) {
  if (events.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          opacity: 0.3,
          fontSize: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
          borderRadius: 4,
        }}
      >
        no data
      </div>
    );
  }

  const times = events.map((e) => e.timestamp);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = max - min || 1;

  const circles = events.map((e) => {
    const x = ((e.timestamp - min) / span) * (width - 6) + 3; // padding
    const isClick = e.type === "click" || e.type === "category_click";
    const color = isClick ? "#2563eb" : "#bbb";
    return `<circle cx="${x}" cy="${height / 2}" r="3" fill="${color}" />`;
  });

  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${circles.join(
    ""
  )}</svg>`;

  return <div dangerouslySetInnerHTML={{ __html: svg }} aria-label="sparkline" />;
}

export default function AnalyticsViewer({ initialEvents }: Props) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [error, setError] = useState<string | null>(null);
  const summary = useMemo(() => aggregate(events), [events]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/hero-analytics/view");
        if (!res.ok) throw new Error("Failed to load events");
        const { events: fresh } = await res.json();
        setEvents(fresh);
      } catch (e: any) {
        setError(e.message || "Refresh error");
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const downloadCSV = useCallback(() => {
    if (!events.length) return;
    const header = ["type", "slideId", "itemId", "ctaText", "timestamp", "receivedAt"];
    const rows = events.map((e) => [
      e.type,
      e.slideId || "",
      e.itemId || "",
      e.ctaText || "",
      e.timestamp.toString(),
      e.receivedAt,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [events]);

  const colorForCtr = (ctr: number) => {
    if (ctr >= 0.1) return "#16a34a";
    if (ctr >= 0.03) return "#d97706";
    return "#b91c1c";
  };

  return (
    <div style={{ marginTop: 16, fontFamily: "system-ui,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      {error && (
        <div style={{ marginBottom: 8, color: "crimson" }}>
          Error refreshing: {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <strong>Total events:</strong> {events.length}
        </div>
        <button onClick={downloadCSV} className="button">
          Export CSV
        </button>
      </div>

      <section style={{ marginTop: 12 }}>
        <h2>Summary (Slides & Categories)</h2>
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            maxWidth: 1100,
            marginBottom: 24,
          }}
        >
          <thead>
            <tr>
              <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "left" }}>Type</th>
              <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "left" }}>ID</th>
              <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "right" }}>Impressions</th>
              <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "right" }}>Clicks</th>
              <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "right" }}>CTR</th>
              <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "center" }}>Sparkline</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(summary).map(
              ([key, { impressions, clicks, ctr, recent, label, kind }]) => {
                const pct = impressions ? ((clicks / impressions) * 100).toFixed(1) : "0.0";
                return (
                  <tr key={key}>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>{kind}</td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>{label}</td>
                    <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "right" }}>
                      {impressions}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "right" }}>
                      {clicks}
                    </td>
                    <td
                      style={{
                        border: "1px solid #ccc",
                        padding: 8,
                        textAlign: "right",
                        color: colorForCtr(ctr),
                        fontWeight: 600,
                      }}
                    >
                      {pct}%
                    </td>
                    <td
                      style={{
                        border: "1px solid #ccc",
                        padding: 8,
                        textAlign: "center",
                        minWidth: 140,
                      }}
                    >
                      <Sparkline events={recent} width={140} height={24} />
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>

        <details>
          <summary>Last 100 raw events</summary>
          <pre
            style={{
              maxHeight: 300,
              overflow: "auto",
              background: "#1f2937",
              color: "#f0f9ff",
              padding: 12,
              borderRadius: 6,
            }}
          >
            {JSON.stringify(events.slice(-100), null, 2)}
          </pre>
        </details>
      </section>
    </div>
  );
}
