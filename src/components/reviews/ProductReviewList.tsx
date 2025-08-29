"use client";

import { useEffect, useState } from "react";
import Stars from "./Stars";

type Review = {
  id: number;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
};
type Stats = {
  count: number;
  average: number;
  breakdown: Record<1|2|3|4|5, number>;
};

export default function ProductReviewList({
  productId,
  refreshSignal,
}: {
  productId: number;
  refreshSignal?: number; // bump to force reload after submit
}) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/reviews?productId=${productId}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || json?.ok === false) throw new Error(json?.error || "Failed to load reviews");
        if (!abort) {
          setStats(json.stats || null);
          setReviews(json.reviews || []);
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || "Failed to load reviews");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [productId, refreshSignal]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="text-lg font-semibold">Customer Reviews</div>
        {stats ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Stars value={stats.average} />
            <span>Avg {stats.average.toFixed(1)} / 5</span>
            <span>•</span>
            <span>{stats.count} {stats.count === 1 ? "review" : "reviews"}</span>
          </div>
        ) : null}
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {loading && <div className="text-sm text-gray-600">Loading…</div>}

      {!loading && (!reviews || reviews.length === 0) && (
        <div className="text-sm text-gray-600">No reviews yet.</div>
      )}

      <ul className="space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-gray-500">
                {new Date(r.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Stars value={r.rating} />
              <span className="text-xs text-gray-600">{r.rating}/5</span>
            </div>
            <p className="mt-2 text-sm text-gray-800 whitespace-pre-line">{r.comment}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
