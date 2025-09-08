// src/components/reviews/HelpfulButton.tsx
"use client";
import { useState } from "react";
import { apiJson, getPersistentFingerprint } from "@/lib/reviews/client-utils";

export default function HelpfulButton({
  reviewId,
  initiallyVoted,
  onVoted,
}: {
  reviewId: number;
  initiallyVoted: boolean;
  onVoted?: (votes: number) => void;
}) {
  const [voted, setVoted] = useState(initiallyVoted);
  const [busy, setBusy] = useState(false);

  const click = async () => {
    if (busy || voted) return;
    setBusy(true);
    try {
      const fingerprint = getPersistentFingerprint();
      const data = await apiJson<{ votes: number }>(`/api/reviews/${reviewId}/helpful`, {
        method: "POST",
        body: JSON.stringify({ fingerprint }),
      });
      setVoted(true);
      onVoted?.(data.votes);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={click}
      disabled={busy || voted}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ring-1 ring-white/15
        ${voted ? "opacity-60 cursor-default" : "hover:bg-white/10"}
      `}
      aria-pressed={voted}
    >
      👍 Helpful {voted ? "✓" : ""}
    </button>
  );
}
