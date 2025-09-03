"use client";

/**
 * Beacon-based analytics sender for Careers events.
 * Uses sendBeacon when available; falls back to fetch(keepalive).
 */
export type CareerEventName = "list_view" | "job_view" | "apply_click";

export async function trackCareerEvent(
  event: CareerEventName,
  payload: Record<string, unknown> = {}
) {
  try {
    const url = "/api/analytics/careers";
    const body = JSON.stringify({ event, ...payload });

    if ("sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }
    await fetch(url, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    });
  } catch {
    // swallow; analytics shouldn't break UX
  }
}
