// src/components/reviews/ReviewsList.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import HelpfulButton from "./HelpfulButton";
import { apiJson, getPersistentFingerprint } from "@/lib/reviews/client-utils";

type ReviewItem = {
  id: number; name: string; rating: number; comment: string;
  createdAt: string; verified: boolean; helpfulCount: number; votedByMe: boolean;
};

export default function ReviewsList({ productId, initialPageSize = 8 }: { productId: string; initialPageSize?: number }) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const sentryRef = useRef<HTMLDivElement | null>(null);
  const fpRef = useRef<string>("");

  // Load first page
  useEffect(() => {
    fpRef.current = getPersistentFingerprint();
    (async () => {
      setLoading(true);
      try {
        const data = await apiJson<{
          items: ReviewItem[]; cursor: string | null;
        }>(`/api/products/${encodeURIComponent(productId)}/reviews?sort=newest&pageSize=${initialPageSize}&fingerprint=${fpRef.current}`);
        setItems(data.items);
        setCursor(data.cursor);
        setExhausted(!data.cursor || data.items.length === 0);
      } finally {
        setLoading(false);
      }
    })();
  }, [productId, initialPageSize]);

  // Infinite scroll
  useEffect(() => {
    if (!sentryRef.current || exhausted || loading) return;
    const io = new IntersectionObserver((entries) => {
      const vis = entries.some((e) => e.isIntersecting);
      if (vis && cursor && !loading) {
        (async () => {
          setLoading(true);
          try {
            const url = `/api/products/${encodeURIComponent(productId)}/reviews?sort=newest&pageSize=${initialPageSize}&cursor=${encodeURIComponent(cursor)}&dir=next&fingerprint=${fpRef.current}`;
            const data = await apiJson<{ items: ReviewItem[]; cursor: string | null }>(url);
            setItems((prev) => [...prev, ...(data.items || [])]);
            setCursor(data.cursor);
            if (!data.cursor || (data.items || []).length === 0) setExhausted(true);
          } finally {
            setLoading(false);
          }
        })();
      }
    }, { rootMargin: "500px 0px" });
    io.observe(sentryRef.current);
    return () => io.disconnect();
  }, [cursor, loading, exhausted, productId, initialPageSize]);

  const bumpHelpful = (reviewId: number, votes: number) => {
    setItems((prev) => prev.map((r) => r.id === reviewId ? { ...r, helpfulCount: votes, votedByMe: true } : r));
  };

  return (
    <div className="space-y-4">
      {items.map((r) => (
        <article key={r.id} className="rounded-lg bg-white/5 p-4 ring-1 ring-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Optional avatar via Cloudflare Images (CDN) */}
              {/* <Image src={cfUrl('<your-avatar-image-id>')} alt={r.name} width={40} height={40} className="rounded-full" /> */}
              <div>
                <div className="font-medium">{r.name} {r.verified && <span className="ml-2 text-xs text-emerald-400">Verified</span>}</div>
                <div className="text-xs text-white/60">{new Date(r.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="text-amber-400" aria-label={`${r.rating} stars`}>
              {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/90">{r.comment}</p>
          <div className="mt-3 flex items-center gap-3">
            <HelpfulButton reviewId={r.id} initiallyVoted={r.votedByMe} onVoted={(v) => bumpHelpful(r.id, v)} />
            <span className="text-sm text-white/70">{r.helpfulCount} found this helpful</span>
          </div>
        </article>
      ))}

      <div ref={sentryRef} />
      {loading && <div className="text-sm text-white/60">Loading…</div>}
      {exhausted && items.length > 0 && <div className="text-sm text-white/60">End of reviews.</div>}
      {!loading && !items.length && <div className="text-sm text-white/60">No reviews yet.</div>}
    </div>
  );
}
