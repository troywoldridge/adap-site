"use client";

import { useEffect, useState, useMemo, useCallback } from "react";

type Event = {
  type: "impression" | "click";
  slideId: string;
  timestamp: number;
  ctaText?: string;
  receivedAt: string;
};

interface Props {
  initialEvents: Event[];
}

type Summary = Record<string, { impressions: number; clicks: number }>;

function aggregate(events: Event[]): Summary {
  const summary: Summary = {};
  for (const ev of events) {
    if (!summary[ev.slideId]) {
      summary[ev.slideId] = { impressions: 0, clicks: 0 };
    }
    if (ev.type === "impression") {
      summary[ev.slideId].impressions += 1;
    }
    if (ev.type === "click") {
      summary[ev.slideId].clicks += 1;
    }
  }
  return summary;
}

export default function AnalyticsViewer({ initialEvents }: Props) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [error, setError] = useState<string | null>(null);
  const summary = useMemo(() => aggregate(events), [events]);

  // Poll every 5 seconds for updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/admin/analytics?raw=1"); // re-request page to get fresh events
        if (!res.ok) {
          throw new Error("Failed to refresh");
        }
        // parse the HTML and extract JSON embedded? Instead, use dedicated endpoint below.
        // We'll call a new helper API to fetch events:
        const dataRes = await fetch("/api/hero-analytics/view");
        if (!dataRes.ok) {
          throw new Error("Failed to load events");
        }
        const { events: fresh } = await dataRes.json();
        setEvents(fresh);
      } catch (e: any) {
        setError(e.message || "Refresh error");
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const downloadCSV = useCallback(() => {
    if (events.length === 0) {
      return;
    }
    const header = ["type", "slideId", "ctaText", "timestamp", "receivedAt"];
    const rows = events.map((e) => [
      e.type,
      e.slideId,
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
    a.download = `hero-analytics-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [events]);

  return (
    <div style={{ marginTop: 16 }}>
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
        <h2>Summary by Slide</h2>
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            maxWidth: 900,
            marginBottom: 24,
          }}
        >
          <thead>
            <tr>
              <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "left" }}>Slide ID</th>
              <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "right" }}>Impressions</th>
              <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "right" }}>Clicks</th>
              <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "right" }}>CTR</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(summary).map(([slideId, { impressions, clicks }]) => {
              const ctr = impressions ? ((clicks / impressions) * 100).toFixed(1) : "0.0";
              return (
                <tr key={slideId}>
                  <td style={{ border: "1px solid #ccc", padding: 8 }}>{slideId}</td>
                  <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "right" }}>{impressions}</td>
                  <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "right" }}>{clicks}</td>
                  <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "right" }}>
                    {ctr}%
                  </td>
                </tr>
              );
            })}
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

