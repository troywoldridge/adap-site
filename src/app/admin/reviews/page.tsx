"use client";
import useSWR from "swr";
import { useState } from "react";
import Stars from "@/components/Stars";

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AdminReviewsPage() {
  const [selected, setSelected] = useState<number[]>([]);
  const [editing, setEditing] = useState<Record<number, { name: string; rating: number; comment: string }>>({});
  const [filterProduct, setFilterProduct] = useState("");
  const [filterRating, setFilterRating] = useState("");
  const [search, setSearch] = useState("");
  const { data: reviews = [], mutate } = useSWR(
    `/api/admin/reviews?productId=${filterProduct}&rating=${filterRating}`,
    fetcher
  );
  const [actionLoading, setActionLoading] = useState(false);

  // Selection logic
  function toggleSelect(id: number) {
    setSelected(s =>
      s.includes(id) ? s.filter(x => x !== id) : [...s, id]
    );
  }
  function selectAll() {
    setSelected(filtered.map((r: any) => r.id));
  }
  function deselectAll() {
    setSelected([]);
  }
  function toggleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      selectAll();
    } else {
      deselectAll();
    }
  }

  // In-table editing
  function startEdit(r: any) {
    setEditing(e => ({
      ...e,
      [r.id]: { name: r.name, rating: r.rating, comment: r.comment },
    }));
  }
  function changeEdit(id: number, field: "name" | "rating" | "comment", value: any) {
    setEditing(e => ({
      ...e,
      [id]: { ...e[id], [field]: value },
    }));
  }
  async function saveEdit(id: number) {
    const e = editing[id];
    if (!e) {
      return;
    }
    await fetch(`/api/admin/reviews/edit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...e }),
    });
    setEditing(editing => {
      const newEd = { ...editing };
      delete newEd[id];
      return newEd;
    });
    mutate();
  }

  async function bulkAction(action: "approve" | "delete") {
    if (!selected.length) {
      return;
    }
    setActionLoading(true);
    await fetch("/api/admin/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected, action }),
    });
    setActionLoading(false);
    setSelected([]);
    mutate();
  }

  const filtered = search
    ? reviews.filter(
        (r: any) =>
          r.comment.toLowerCase().includes(search.toLowerCase()) ||
          r.name.toLowerCase().includes(search.toLowerCase())
      )
    : reviews;

  return (
    <main className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Pending Product Reviews</h1>
      
      {/* === DOWNLOAD LINKS === */}
      <div style={{ marginBottom: 24 }}>
        <a
          href="/api/admin/reviews/export?format=csv"
          className="artwork-upload-btn"
          style={{ marginRight: 16 }}
          download
        >
          Export Reviews (CSV)
        </a>
        <a
          href="/api/admin/reviews/export?format=json"
          className="artwork-upload-btn"
          download
        >
          Export Reviews (JSON)
        </a>
      </div>
      {/* === END DOWNLOAD LINKS === */}

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Search name or text..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border px-3 py-2 rounded"
        />
        <input
          type="text"
          placeholder="Filter by Product ID"
          value={filterProduct}
          onChange={e => setFilterProduct(e.target.value)}
          className="border px-3 py-2 rounded"
        />
        <select
          value={filterRating}
          onChange={e => setFilterRating(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="">All Ratings</option>
          {[5,4,3,2,1].map(r => (
            <option key={r} value={r}>{r} Stars</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={selected.length === filtered.length && filtered.length > 0}
          onChange={toggleSelectAll}
          style={{ marginRight: 10 }}
        /> Select All
        <button
          className="artwork-upload-btn"
          disabled={!selected.length || actionLoading}
          onClick={() => bulkAction("approve")}
          style={{ marginRight: 8, marginLeft: 18 }}
        >
          Approve Selected
        </button>
        <button
          className="artwork-upload-btn"
          disabled={!selected.length || actionLoading}
          style={{ background: "#b91c1c" }}
          onClick={() => bulkAction("delete")}
        >
          Delete Selected
        </button>
        <span style={{ marginLeft: 16, fontSize: 14, color: "#555" }}>
          {selected.length} selected
        </span>
      </div>

      {!filtered.length && <div className="text-gray-600">No pending reviews 🎉</div>}
      <ul className="space-y-7">
        {filtered.map((r: any) => (
          <li key={r.id} className="border rounded-lg p-5 flex flex-col md:flex-row gap-4 items-start">
            <input
              type="checkbox"
              checked={selected.includes(r.id)}
              onChange={() => toggleSelect(r.id)}
              style={{ marginTop: 6, marginRight: 12 }}
            />
            <div className="min-w-[110px] flex flex-col items-center">
              <Stars rating={editing[r.id]?.rating ?? r.rating} />
              <input
                type="number"
                min={1}
                max={5}
                value={editing[r.id]?.rating ?? r.rating}
                onChange={e => changeEdit(r.id, "rating", parseInt(e.target.value))}
                className="border rounded px-2 py-1 mt-2"
                style={{ width: 55, textAlign: "center" }}
                disabled={!editing[r.id]}
              />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={editing[r.id]?.name ?? r.name}
                onChange={e => changeEdit(r.id, "name", e.target.value)}
                disabled={!editing[r.id]}
                className="border rounded px-2 py-1 font-semibold mb-2"
                style={{ width: "60%" }}
              />
              <textarea
                value={editing[r.id]?.comment ?? r.comment}
                onChange={e => changeEdit(r.id, "comment", e.target.value)}
                disabled={!editing[r.id]}
                className="border rounded px-2 py-1 mb-2"
                rows={2}
                style={{ width: "100%" }}
              />
              <div className="text-xs text-gray-500">
                Product ID: <span className="font-mono">{r.productId}</span>
                {r.email && <> &middot; Email: <span className="font-mono">{r.email}</span></>}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {editing[r.id] ? (
                <button
                  className="artwork-upload-btn"
                  style={{ background: "#2563eb" }}
                  onClick={() => saveEdit(r.id)}
                  type="button"
                >
                  Save
                </button>
              ) : (
                <button
                  className="artwork-upload-btn"
                  style={{ background: "#f59e42" }}
                  onClick={() => startEdit(r)}
                  type="button"
                >
                  Edit
                </button>
              )}
              <button
                className="artwork-upload-btn"
                style={{ background: "#22c55e" }}
                disabled={actionLoading}
                onClick={() => bulkAction("approve")}
              >
                Approve
              </button>
              <button
                className="artwork-upload-btn"
                style={{ background: "#b91c1c" }}
                disabled={actionLoading}
                onClick={() => bulkAction("delete")}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
