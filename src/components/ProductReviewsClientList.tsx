"use client";

import { useState } from "react";

type Rev = { id: number; name: string; rating: number; comment: string; createdAt: Date | string | null };
type Stats = { count: number; average: number; breakdown: Record<1|2|3|4|5, number> };

function Stars({ n }: { n: number }) {
  return <span aria-label={`${n} out of 5`}>{"★★★★★☆☆☆☆☆".slice(5 - n, 10 - n)}</span>;
}

export default function ReviewsClientList({
  productId,
  initialReviews,
  stats,
}: {
  productId: string;
  initialReviews: Rev[];
  stats: Stats;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [votes, setVotes] = useState<Record<number, number>>({}); // reviewId -> count
  const [busy, setBusy] = useState<number | null>(null);

  async function markHelpful(id: number) {
    setBusy(id);
    try {
      const res = await fetch(`/api/reviews/${id}/helpful`, { method: "POST", headers: { "content-type": "application/json" } });
      const data = await res.json();
      if (res.ok && data?.ok) {
        setVotes((v) => ({ ...v, [id]: data.votes ?? ((v[id] || 0) + 1) }));
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-8">
      <header className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="text-lg font-semibold">Customer Reviews</h3>
          <div className="text-sm text-gray-600">
            {stats.count} review{stats.count === 1 ? "" : "s"} • Avg {stats.average.toFixed(1)} / 5
          </div>
        </div>
      </header>

      <ul className="space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{r.name}</div>
              <div className="text-yellow-600"><Stars n={r.rating} /></div>
            </div>
            <p className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{r.comment}</p>

            <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
              <time dateTime={r.createdAt ? new Date(r.createdAt).toISOString() : undefined}>
                {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
              </time>

              <button
                onClick={() => markHelpful(r.id)}
                disabled={busy === r.id}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                👍 Helpful {votes[r.id] ? `(${votes[r.id]})` : ""}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
