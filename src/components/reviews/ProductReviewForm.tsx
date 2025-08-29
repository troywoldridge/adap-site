"use client";

import { useState } from "react";

export default function ProductReviewForm({
  productId,
  productName,
  onSubmitted,
}: {
  productId: number;
  productName: string;
  onSubmitted?: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [agree, setAgree] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrMsg(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: String(productId), name, email, rating, comment, termsAgreed: agree }),
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) throw new Error(json?.error || "Failed to submit review");
      setOkMsg("Thanks! Your review was submitted and is pending approval.");
      setName(""); setEmail(""); setRating(5); setComment(""); setAgree(false);
      onSubmitted?.();
    } catch (e: any) {
      setErrMsg(e?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="text-lg font-semibold">Leave a review</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Rating</label>
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="h-9 rounded-md border border-gray-300 px-2 text-sm"
        >
          {[5,4,3,2,1].map((v) => (
            <option key={v} value={v}>{v} ★</option>
          ))}
        </select>
      </div>

      <textarea
        required
        rows={5}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={`Share details about your experience with ${productName}…`}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        I agree to the terms for posting a review.
      </label>

      {errMsg && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errMsg}</div>}
      {okMsg && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{okMsg}</div>}

      <button
        type="submit"
        disabled={submitting || !agree}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow hover:bg-blue-800 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
