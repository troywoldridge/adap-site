// src/lib/heroAnalytics.ts
export function trackHeroImpression(slideId: string) {
  navigator.sendBeacon("/api/hero-analytics", JSON.stringify({
    type: "impression",
    slideId,
    timestamp: Date.now(),
    page: window.location.pathname,
  }));
}

export function trackHeroClick(slideId: string, ctaText: string) {
  fetch("/api/hero-analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "click",
      slideId,
      ctaText,
      timestamp: Date.now(),
      page: window.location.pathname,
    }),
  });
}
