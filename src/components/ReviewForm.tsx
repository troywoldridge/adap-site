"use client";
import { useState } from "react";
import Stars from "@/components/Stars";

export default function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false); // <-- NEW
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!termsAgreed) {
      return;
    }
    setSubmitting(true);
    await fetch(`/api/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, rating, comment, termsAgreed, verified }), // Pass verified
    });
    setSubmitting(false);
    setDone(true);
    setName(""); setEmail(""); setRating(0); setComment(""); setVerified(false); setTermsAgreed(false);
  }

  if (done) return <div className="text-green-700 font-semibold py-4">Thank you for your review! It will appear after approval.</div>;

  return (
    <form onSubmit={handleSubmit} className="review-form space-y-4 mt-7 max-w-lg">
      {/* ...other fields... */}
      <div>
        <label htmlFor="rating" className="block font-semibold">Your Rating:</label>
        <Stars rating={rating} editable onRate={setRating} />
      </div>
      {/* ...name, email, comment... */}
      <div className="flex items-center gap-2 mt-2">
        <input
          type="checkbox"
          id="verified"
          checked={verified}
          onChange={e => setVerified(e.target.checked)}
        />
        <label htmlFor="verified" className="text-sm">
          I purchased this item
        </label>
      </div>
      {/* ...terms checkbox, submit button... */}
    </form>
  );
}
