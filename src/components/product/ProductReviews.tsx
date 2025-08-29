"use client";

import { useEffect, useMemo, useState } from "react";

type Stats = {
  count: number;
  average: number;
  breakdown: { [stars: number]: number };
};

type Review = {
  id: number | string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export default function ProductReviews({
  productId,
  productName,
}: {
  productId: string | number;
  productName?: string;
}) {
  const pid = String(productId);

  // list + stats
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);

  // form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<null | "ok" | "err">(null);
  const [submitMsg, setSubmitMsg] = useState<string>("");

  const avgLabel = useMemo(() => {
    if (!stats) return "0.0 / 5";
    return `${stats.average.toFixed(1)} / 5`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats?.average, stats?.count]);

  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/reviews?productId=${encodeURIComponent(pid)}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok || json?.ok === false) {
          throw new Error(json?.error || `Failed (${res.status})`);
        }
        if (!abort) {
          setStats(json.stats as Stats);
          setReviews(json.reviews as Review[]);
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || "Failed to load reviews");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [pid]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitted(null);
    setSubmitMsg("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: pid,
          name: name.trim(),
          email: email.trim() || undefined,
          rating,
          comment: comment.trim(),
          termsAgreed: terms,
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `Submit failed (${res.status})`);
      }
      setSubmitted("ok");
      setSubmitMsg("Thanks! Your review was submitted and is pending moderation.");
      // clear the form (optional)
      setName("");
      setEmail("");
      setRating(5);
      setComment("");
      setTerms(false);
    } catch (e: any) {
      setSubmitted("err");
      setSubmitMsg(e?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const total = stats?.count ?? 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,520px)_1fr]">
      {/* left: form */}
      <section aria-labelledby="leave-review">
        <h3 id="leave-review" className="mb-3 text-base font-semibold text-gray-900">
          Leave a review{productName ? ` for ${productName}` : ""}
        </h3>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Email (optional)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Rating</label>
            <select
              className="h-9 rounded-md border border-gray-300 px-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} ★
                </option>
              ))}
            </select>
          </div>

          <textarea
            className="min-h-[120px] w-full rounded-md border border-gray-300 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Share details about your experience…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="mt-1"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              required
            />
            <span>I agree to the terms for posting a review.</span>
          </label>

          {submitted && (
            <div
              className={[
                "rounded-md border px-3 py-2 text-sm",
                submitted === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700",
              ].join(" ")}
            >
              {submitMsg}
            </div>
          )}

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white shadow hover:bg-blue-800 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit review"}
          </button>
        </form>
      </section>

      {/* right: stats + list */}
      <section aria-labelledby="customer-reviews">
        <h3 id="customer-reviews" className="mb-3 text-base font-semibold text-gray-900">
          Customer Reviews
        </h3>

        <div className="mb-4 flex items-center gap-3 text-sm text-gray-700">
          <span className="font-medium">{total} review{total === 1 ? "" : "s"}</span>
          <span>•</span>
          <span>Avg {avgLabel}</span>
        </div>

        {/* breakdown */}
        {stats && (
          <ul className="mb-6 space-y-1 text-sm">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.breakdown?.[star] ?? 0;
              const pct = total ? Math.round((count / total) * 100) : 0;
              return (
                <li key={star} className="flex items-center gap-3">
                  <span className="w-10 text-right">{star}★</span>
                  <div className="h-2 w-full rounded bg-gray-200">
                    <div
                      className="h-2 rounded bg-blue-600"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right tabular-nums text-gray-600">{count}</span>
                </li>
              );
            })}
          </ul>
        )}

        {/* list */}
        <ul className="space-y-4">
          {loading && <li className="text-sm text-gray-500">Loading…</li>}
          {error && <li className="text-sm text-red-700">{error}</li>}
          {!loading && !error && reviews.length === 0 && (
            <li className="text-sm text-gray-500">No reviews yet.</li>
          )}
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900">{r.name}</div>
                <div className="text-xs text-gray-500">
                  {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="mt-1 text-sm text-amber-600">
                {"★".repeat(r.rating)}{" "}
                <span className="text-gray-400">{"★".repeat(5 - r.rating)}</span>
              </div>
              <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{r.comment}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
