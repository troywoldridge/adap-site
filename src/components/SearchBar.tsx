// src/components/SearchBar.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

export default function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Optional: ⌘/Ctrl+K focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      aria-label="Site search"
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        router.push(query ? `/search?query=${encodeURIComponent(query)}` : "/search");
      }}
      className="searchbar"
      // prevent any browser/3rd-party suggestion UIs
      autoComplete="off"
    >
      <input
        ref={inputRef}
        type="search"
        inputMode="search"
        autoComplete="off"
        aria-label="Search products"
        placeholder="Search products…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button type="submit" aria-label="Search">🔍</button>
      <style jsx>{`
        .searchbar {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        input {
          min-width: 260px;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #ddd;
          outline: none;
        }
        input:focus { border-color: #c62828; box-shadow: 0 0 0 3px #c6282822; }
        button {
          border: none;
          background: #c62828;
          color: #fff;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
        }
        button:hover { opacity: .95; }
      `}</style>
    </form>
  );
}
