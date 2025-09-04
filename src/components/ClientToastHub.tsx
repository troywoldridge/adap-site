"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; message: string; tone?: "success" | "error" | "info" };

export default function ClientToastHub() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let seq = 1;
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const t: Toast = {
        id: seq++,
        message: String(detail.message || ""),
        tone: detail.tone || "info",
      };
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 2500);
    };
    window.addEventListener("cart:toast", onToast as EventListener);
    return () => window.removeEventListener("cart:toast", onToast as EventListener);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "rounded-md px-3 py-2 text-sm shadow-md",
            t.tone === "error"
              ? "bg-red-600 text-white"
              : t.tone === "success"
              ? "bg-green-600 text-white"
              : "bg-gray-900 text-white",
          ].join(" ")}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
