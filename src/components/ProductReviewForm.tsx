"use client";

import { useState } from "react";

export default function ProductReviewForm({ productId }: { productId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | "ok" | "err">(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, name, email, rating, comment, termsAgreed: agree }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setDone("ok");
      setName(""); setEmail(""); setComment(""); setAgree(false); setRating(5);
    } catch (e: any) {
      setDone("err");
      setError(e?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold">Leave a review</h3>
      {done === "ok" && (
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Thanks! Your review was submitted and is pending approval.
        </p>
      )}
      {done === "err" && error && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input
          className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <label className="text-sm">Rating</label>
        <select
          className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
        >
          {[5,4,3,2,1].map((r) => (
            <option key={r} value={r}>{r} ⭐</option>
          ))}
        </select>
      </div>

      <textarea
        className="mt-3 min-h-[120px] w-full rounded-lg border border-gray-300 p-3 text-sm"
        placeholder="Share details about your experience…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        I agree to the terms for posting a review.
      </label>

      <div className="mt-4 flex justify-end">
        <button
          onClick={submit}
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow hover:bg-blue-800 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit review"}
        </button>
      </div>
    </div>
  );
}
