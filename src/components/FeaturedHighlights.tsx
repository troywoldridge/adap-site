// src/components/FeaturedHighlights.tsx
"use client";

import React from "react";
import Link from "next/link";

const topBenefits = [
  {
    id: "trade-pricing",
    title: "Low trade pricing",
    description: "Make more money with competitive, predictable margins.",
    // replace with your SVG or image if desired
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10
             10-4.48 10-10S17.52 2 12 2zm1 17.93c-2.83.48-5.73-.24-7.93-1.93
             1.34-1.72 3.32-2.81 5.55-2.81 2.23 0 4.21 1.09 5.55 2.81-1.59
             1.29-3.5 2.09-5.17 2.03v-.1zM17.66 14c-.43-1.23-1.33-2.25-2.49-2.85
             .45-.78.69-1.67.69-2.6 0-2.76-2.24-5-5-5S6.86 6.79 6.86 9.55c0
             .93.24 1.82.69 2.6-1.16.6-2.06 1.62-2.49 2.85C3.6 14.59 3 13.33 3
             12c0-4.97 4.03-9 9-9s9 4.03 9 9c0 1.33-.6 2.59-1.34 3.93z"
        />
      </svg>
    ),
  },
  {
    id: "one-stop",
    title: "One-stop shop",
    description: "Become the go-to source for all your clients' printing needs.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 2L2 7v7c0 5.25 3.84 9.81 9 10 5.16-.19 9-4.75 9-10V7l-10-5zm0
            2.18L18.74 7 12 9.82 5.26 7 12 4.18zm-6 6.49l6 2.82 6-2.82V14c0
            3.87-3.13 7-7 7s-7-3.13-7-7v-1.33z"
        />
      </svg>
    ),
  },
  {
    id: "on-time",
    title: "On-time fulfillment",
    description: "Get repeat orders by delivering high-quality products when promised.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 1a11 11 0 1 0 11 11A11 11 0 0 0 12 1zm1 11.59V7h-2v6l5
             3 .99-1.66-4-2.75z"
        />
      </svg>
    ),
  },
];

const promises = [
  {
    id: "delivery",
    text: "On time delivery anywhere in USA",
  },
  {
    id: "no-hidden",
    text: "No hidden costs, no delays, & no paperwork",
  },
  {
    id: "tracking",
    text: "24/7 live order tracking",
  },
];

export default function FeaturedHighlights() {
  return (
    <div style={{ padding: "4rem 0", background: "white" }}>
      <div
        className="container"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "2rem",
          justifyContent: "space-between",
          marginBottom: "2.5rem",
        }}
      >
        {topBenefits.map((b) => (
          <div
            key={b.id}
            style={{
              flex: "1 1 220px",
              display: "flex",
              gap: "1rem",
              alignItems: "flex-start",
              minWidth: 220,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                flex: "0 0 48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-primary)",
              }}
            >
              {b.icon}
            </div>
            <div style={{ flex: "1" }}>
              <h4 style={{ margin: "0 0 4px", fontSize: "1rem" }}>{b.title}</h4>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-muted)" }}>
                {b.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div
        className="container"
        style={{
          borderTop: "1px solid #e5e7eb",
          paddingTop: "2rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1.5rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ flex: "1 1 100%", textAlign: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>Our promise to you:</h2>
        </div>
        {promises.map((p) => (
          <div
            key={p.id}
            style={{
              flex: "1 1 220px",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              minWidth: 200,
            }}
          >
            <div
              aria-hidden="true"
              style={{ color: "#4ade80", flex: "0 0 32px", fontSize: 24 }}
            >
              {/* checkmark */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="12" fill="#d1f7d8" />
                <path
                  d="M7 12.5l3 3 7-7"
                  stroke="#22c55e"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div style={{ flex: "1" }}>
              <p style={{ margin: 0, fontSize: "0.95rem" }}>{p.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
