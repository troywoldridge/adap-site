"use client";
import { useState } from "react";

export default function ArtworkUploadBoxes({
  productId,
  numSides,
}: {
  productId: string;
  numSides: number;
}) {
  const [files, setFiles] = useState<(File | null)[]>(Array(numSides).fill(null));
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(idx: number, file: File | null) {
    if (file && file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }
    setError(null);
    setFiles((f) => {
      const arr = [...f];
      arr[idx] = file;
      return arr;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.some((f) => !f)) {
      setError("Please select a file for every side.");
      return;
    }
    setError(null);
    setUploading(true);
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("productId", productId);
        formData.append("side", String(idx + 1));
        await fetch("/api/artwork/upload", { method: "POST", body: formData });
      }
    }
    setUploading(false);
    setDone(true);
    setFiles(Array(numSides).fill(null));
  }

  return (
    <form onSubmit={handleSubmit} className="artwork-upload-form">
      {Array.from({ length: numSides }).map((_, idx) => (
        <div key={idx} className="artwork-upload-box">
          <label className="artwork-upload-label">
            {numSides > 1 ? `Side #${idx + 1}` : "Artwork File"}
          </label>
          <div className="artwork-upload-note">
            Only PDF files allowed. Files should be 300dpi, with 1/8&quot; bleed, and final trim size.
          </div>
          <input
            type="file"
            accept="application/pdf"
            required
            className="artwork-upload-input"
            onChange={(e) => handleFile(idx, e.target.files?.[0] || null)}
          />
          {files[idx] && (
            <span className="artwork-upload-filename">
              File: {files[idx]?.name}
            </span>
          )}
        </div>
      ))}
      {error && <div className="artwork-upload-error">{error}</div>}
      <button
        type="submit"
        className="artwork-upload-btn"
        disabled={uploading || files.some((f) => !f)}
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
      {done && (
        <div className="artwork-upload-success">
          Upload complete! Thank you.
        </div>
      )}
    </form>
  );
}
