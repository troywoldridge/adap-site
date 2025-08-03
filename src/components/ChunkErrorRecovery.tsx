"use client";

import { useEffect } from "react";

export default function ChunkErrorRecovery() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      const isChunkLoad =
        (e.error && e.error.name === "ChunkLoadError") ||
        /Loading chunk .* failed/.test(e.message || "");

      if (!isChunkLoad) return;

      const key = "chunk-reload-attempted";
      if (sessionStorage.getItem(key)) {
        return;
      }
      sessionStorage.setItem(key, "1");

      setTimeout(() => {
        window.location.reload();
      }, 200);
    };

    window.addEventListener("error", onError);
    return () => window.removeEventListener("error", onError);
  }, []);

  return null;
}
