// src/components/reviews/ReviewForm.tsx
"use client";
import { useState } from "react";
import TurnstileWidget from "./TurnstileWidget";
import { apiJson } from "@/lib/reviews/client-utils";

export default function ReviewForm({
  productId,
  turnstileSiteKey,
  onSubmitted,
}: {
  productId: string;
  turnstileSiteKey: string;
  onSubmitted?: () => void;
}) {
  const [turnstileToken, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null); setOk(false);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      rating: Number(fd.get("rating") || 0),
      comment: String(fd.get("comment") || ""),
      termsAgreed: fd.get("terms") === "on",
      turnstileToken,
      // Honeypot: real users won’t fill this
      website: String(fd.get("website") || ""),
    };

    try {
      setBusy(true);
      await apiJson(`/api/products/${encodeURIComponent(productId)}/reviews`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setOk(true);
      e.currentTarget.reset();
      onSubmitted?.();
    } catch (e: any) {
      setErr(e?.message || "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input name="name" required placeholder="Your name"
          className="h-11 rounded-md bg-white/5 px-3 ring-1 ring-white/10" />
        <input name="email" type="email" placeholder="Email (optional)"
          className="h-11 rounded-md bg-white/5 px-3 ring-1 ring-white/10" />
      </div>

      <select name="rating" required className="h-11 rounded-md bg-white/5 px-3 ring-1 ring-white/10">
        <option value="">Rating</option>
        <option value="5">★★★★★ – 5</option>
        <option value="4">★★★★☆ – 4</option>
        <option value="3">★★★☆☆ – 3</option>
        <option value="2">★★☆☆☆ – 2</option>
        <option value="1">★☆☆☆☆ – 1</option>
      </select>

      <textarea name="comment" required minLength={5} maxLength={2000}
        placeholder="Share details that will help other buyers…"
        className="min-h-28 rounded-md bg-white/5 px-3 py-2 ring-1 ring-white/10" />

      {/* honeypot */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="terms" required /> I agree to the review terms.
      </label>

      <TurnstileWidget siteKey={turnstileSiteKey} onVerify={setToken} />

      <div className="flex items-center gap-3">
        <button disabled={busy || !turnstileToken}
          className="h-11 px-5 rounded-lg bg-[#0047ab] hover:bg-[#003a8f] font-semibold">
          {busy ? "Submitting…" : "Submit review"}
        </button>
        {ok && <span className="text-emerald-400 text-sm">Thanks! Submitted.</span>}
        {err && <span className="text-red-400 text-sm">{err}</span>}
      </div>
    </form>
  );
}
