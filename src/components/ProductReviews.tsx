"use client";
import { useState } from "react";
import useSWR from "swr";
import Stars from "@/components/Stars";

const PAGE_SIZE = 5;
const SORT_OPTIONS = [
  { value: "latest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "highest", label: "Highest Rated" },
  { value: "lowest", label: "Lowest Rated" },
];

// --- Helpful votes mini-component ---
function Helpful({ reviewId }: { reviewId: number }) {
  const [voted, setVoted] = useState(false);
  const [error, setError] = useState("");
  const { data: counts, mutate } = useSWR(
    `/api/reviews/${reviewId}/helpful-count`,
    (url) => fetch(url).then((r) => r.json())
  );

  async function vote(isHelpful: boolean) {
    setError("");
    const res = await fetch(`/api/reviews/${reviewId}/helpful`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHelpful }),
    });
    if (res.status === 409) {
      setError("You already voted on this review.");
      setVoted(true);
      return;
    }
    if (!res.ok) {
      setError("Something went wrong.");
      return;
    }
    setVoted(true);
    mutate();
  }

  return (
    <div className="helpful-row" style={{ marginTop: 8 }}>
      <span style={{ marginRight: 12 }}>Was this review helpful?</span>
      <button
        className="artwork-upload-btn"
        style={{ background: "#22c55e", marginRight: 4, padding: "0.3em 0.9em" }}
        onClick={() => vote(true)}
        disabled={voted}
        type="button"
      >Yes</button>
      <span style={{ marginRight: 12 }}>{counts?.helpful || 0}</span>
      <button
        className="artwork-upload-btn"
        style={{ background: "#b91c1c", padding: "0.3em 0.9em" }}
        onClick={() => vote(false)}
        disabled={voted}
        type="button"
      >No</button>
      <span>{counts?.notHelpful || 0}</span>
      {error && <span className="artwork-upload-error" style={{ marginLeft: 10 }}>{error}</span>}
    </div>
  );
}

// --- Main ProductReviews component ---
function fetcher(url: string) {
  return fetch(url).then(r => r.json());
}

export default function ProductReviews({ productId }: { productId: string }) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("latest");
  const { data, isLoading } = useSWR(
    `/api/products/${productId}/reviews?sort=${sort}&page=${page}&pageSize=${PAGE_SIZE}`,
    fetcher
  );

  const reviews = data?.reviews || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (isLoading) return <div>Loading reviews…</div>;
  if (!reviews.length) return <div className="text-gray-500">No reviews yet. Be the first to review!</div>;

  return (
    <section className="product-reviews space-y-8 mt-10">
      <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
        <h3 className="section-title" style={{ margin: 0, flex: 1 }}>Customer Reviews</h3>
        <label style={{ fontSize: "0.98em", marginRight: 10 }}>Sort:</label>
        <select
          value={sort}
          onChange={e => { setSort(e.target.value); setPage(1); }}
          className="border px-2 py-1 rounded"
        >
          {SORT_OPTIONS.map(opt => (
            <option value={opt.value} key={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {reviews.map((r: any) => (
        <div key={r.id} className="border-b pb-6">
          <div className="flex items-center gap-2 mb-1">
            <Stars rating={r.rating} />
            <span className="font-semibold text-neutral-700">{r.name}</span>
            <span className="text-xs text-muted-foreground">{new Date(r.createdAt || r.created_at).toLocaleDateString()}</span>
            {r.verified && (
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold flex items-center gap-1">
                <svg viewBox="0 0 16 16" width={14} height={14} className="inline"><circle cx="8" cy="8" r="7" fill="#34d399" /><path d="M5 8.5l2 2 4-4" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
                Verified Buyer
              </span>
            )}
          </div>
          <div className="text-base text-neutral-800">{r.comment}</div>
          {/* --- Was this review helpful? --- */}
          <Helpful reviewId={r.id} />
        </div>
      ))}
      {/* Pagination */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 18, gap: 8 }}>
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="artwork-upload-btn"
        >Previous</button>
        <span style={{ alignSelf: "center" }}>
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page === totalPages || totalPages === 0}
          onClick={() => setPage(page + 1)}
          className="artwork-upload-btn"
        >Next</button>
      </div>
    </section>
  );
}
