"use client";
import { useRef, useState } from "react";

export default function ProductArtworkUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState<string>("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) setFilename(e.target.files[0].name);
  }

  return (
    <div className="my-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <button
        type="button"
        className="w-full bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 rounded mb-2"
        onClick={() => fileInputRef.current?.click()}
      >
        {filename ? `Selected: ${filename}` : "Upload your artwork"}
      </button>
      {filename && <div className="text-xs text-gray-600">PDF or image files only. Max 50MB.</div>}
    </div>
  );
}
