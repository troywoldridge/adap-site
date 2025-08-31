// src/components/NotificationBar.tsx
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "adap_notice_dismissed_v1";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default function NotificationBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setShow(true);
        return;
      }
      const parsed = JSON.parse(raw) as { dismissedAt?: number };
      if (!parsed.dismissedAt || Date.now() - parsed.dismissedAt > ONE_DAY_MS) {
        setShow(true);
      }
    } catch {
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ dismissedAt: Date.now() })
      );
    } catch {
      // ignore
    }
  };

  if (!show) return null;

  return (
    <div className="w-full border-b border-amber-300 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center relative px-4 py-2 text-sm">
        {/* Centered message */}
        <div className="flex items-center gap-2 text-center">
          <span aria-hidden>⚠️</span>
          <p className="leading-tight">
            We are currently experiencing high volumes for roll labels and
            Business Cards UV/Foil orders. Thank you for your patience!
          </p>
        </div>

        {/* Dismiss button absolutely on the right */}
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 rounded-md p-1 hover:bg-white/20"
          aria-label="Dismiss notice"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
