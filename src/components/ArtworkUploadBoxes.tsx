// src/components/ArtworkUploadBoxes.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* =========================================================
   Config (tweak as you like)
   ========================================================= */
const ACCEPT_EXT = [
  ".pdf", ".ai", ".eps", ".psd", ".tif", ".tiff", ".jpg", ".jpeg", ".png", ".svg",
];
const ACCEPT = ACCEPT_EXT.join(",");
const MAX_FILE_MB = 500;           // per-file cap
const MAX_TOTAL_FILES = 50;        // friendly session cap
const UPLOAD_CONCURRENCY = 3;      // parallel uploads
const RETRIES = 2;                  // retries per file
const DRAFT_KEY = "ADAP_UPLOAD_DRAFT_V1";

// Pin a pdf.js worker (only used for client-side PDF thumbnails)
const PDFJS_WORKER_SRC =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.mjs";

/* =========================================================
   Types
   ========================================================= */
type Props = {
  /** Temp id from page; replaced by DB lineId after ensure(). */
  lineId: string;
  /** 1..10 sides supported */
  sides: number;
  /** Product being uploaded to */
  productId: number;
};

type EnsureLineResponse =
  | { ok: true; lineId: string; quantity: number }
  | { ok: false; error: string };

type PresignResponse = {
  ok: boolean;
  uploadUrl?: string;
  key?: string;
  publicUrl?: string;
  contentType?: string;
  error?: string;
};

type PartToAttach = { key: string; url: string; fileName: string; thumbKey?: string; thumbUrl?: string; cfImageId?: string };

type FileStatus =
  | { kind: "idle" }
  | { kind: "presigning" }
  | { kind: "uploading"; progress: number }
  | { kind: "done" }
  | { kind: "error"; message: string };

type FileItem = {
  id: string;
  file?: File;
  name: string;
  type: string;
  size: number;
  previewUrl?: string | null; // local preview for raster while pending
  // Upload result:
  key?: string;               // R2 object key
  url?: string;               // public URL (CF CDN)
  // Optional thumbnail result:
  _thumbKey?: string;
  _thumbUrl?: string;
  status: FileStatus;
};

type Slot = {
  side: number;              // 1-based label (cosmetic)
  items: FileItem[];         // ordered
};

/* =========================================================
   Helper utils
   ========================================================= */
const isImage = (mime: string) => /^image\//i.test(mime);
const asMB = (bytes: number) => (bytes / 1024 / 1024);
const withinLimit = (f: File) => asMB(f.size) <= MAX_FILE_MB;
const uid = () => Math.random().toString(36).slice(2);
const safeName = (n?: string | null, fb = "artwork") => (n?.trim() || fb);
function formatErr(e: unknown): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e) return String((e as any).message);
  return "Unexpected error";
}

/** Cloudflare Images (unused for uploads here, but handy if you store cfImageId later) */
function cfImageUrl(id?: string | null, variant = "public"): string | null {
  if (!id) return null;
  const acct = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH || "pJ0fKvjCAbyoF8aD0BGu8Q";
  return `https://imagedelivery.net/${acct}/${id}/${variant}`;
}

function extOf(name: string) {
  const m = /\.[^.]+$/.exec(name || "");
  return (m ? m[0] : "").toLowerCase();
}

function mimeFromExt(ext: string): string | undefined {
  switch (ext) {
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".gif": return "image/gif";
    case ".svg": return "image/svg+xml";
    case ".tif":
    case ".tiff": return "image/tiff";
    case ".pdf": return "application/pdf";
    case ".ai": return "application/postscript";
    case ".eps": return "application/postscript";
    case ".psd": return "image/vnd.adobe.photoshop";
    default: return undefined;
  }
}

function ensureContentTypeFor(file: File): string {
  return file.type || mimeFromExt(extOf(file.name)) || "application/octet-stream";
}


/* =========================================================
   Client-side thumbnail generation
   ========================================================= */

/** Render first page of a PDF to a JPEG blob using pdf.js (gracefully falls back) */
async function renderPdfFirstPageToBlob(file: File): Promise<Blob | null> {
  try {
    // Lazy import pdfjs (no SSR)
    // @ts-ignore
    const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
    // pdf.js v4 requires worker; load from CDN for simplicity
    (pdfjs as any).GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;

    const buf = await file.arrayBuffer();
    const pdf = await (pdfjs as any).getDocument({ data: buf }).promise;
    const page = await pdf.getPage(1);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9),
    );
    return blob;
  } catch {
    return null;
  }
}

/** Downscale raster image to JPEG blob (max width ~1024px) */
async function downscaleImageToBlob(file: File, maxW = 1024): Promise<Blob | null> {
  try {
    const img = document.createElement("img");
    img.decoding = "async";
    img.loading = "eager";
    img.src = URL.createObjectURL(file);
    await new Promise((ok, err) => {
      img.onload = () => ok(null);
      img.onerror = () => err(new Error("Image load failed"));
    });
    const scale = Math.min(1, maxW / (img.naturalWidth || maxW));
    const w = Math.max(1, Math.round((img.naturalWidth || maxW) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || maxW) * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(img.src);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88),
    );
    return blob;
  } catch {
    return null;
  }
}

/* =========================================================
   Component
   ========================================================= */
export default function ArtworkUploadBoxes({ lineId: initialLineId, sides, productId }: Props) {
  const router = useRouter();
  const [dbLineId, setDbLineId] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reorder sides (drag)
  const sideDragIdx = useRef<number | null>(null);

  // Reorder/move files (drag)
  const [fileDrag, setFileDrag] = useState<{ fromSideIdx: number; fileId: string } | null>(null);

  // Build sides 1..N
  const initialSlots = useMemo<Slot[]>(
    () =>
      Array.from({ length: Math.max(1, Math.min(10, Math.floor(sides || 2))) }, (_, i) => ({
        side: i + 1,
        items: [],
      })),
    [sides],
  );
  const [slots, setSlots] = useState<Slot[]>(initialSlots);

  // Input refs per side
  const fileInputs = useRef<Array<HTMLInputElement | null>>([]);

  // Persist draft selections
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { slots: Slot[] };
      if (parsed && Array.isArray(parsed.slots)) {
        setSlots(
          parsed.slots.map((s) => ({
            ...s,
            items: s.items.map((it) => ({
              ...it,
              previewUrl: null, // object URLs can’t be restored
              status: { kind: "idle" },
              key: undefined,
              url: undefined,
              _thumbKey: undefined,
              _thumbUrl: undefined,
            })),
          })),
        );
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ slots }));
    } catch {}
  }, [slots]);

  // Warn on unload when busy
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (busy) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy]);

  /* ---------------- Ensure a real DB line on mount ---------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setFatal(null);
        const res = await fetch("/api/cart/lines/ensure", {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ productId, qty: 1 }),
        });
        const json = (await res.json()) as EnsureLineResponse;
        if (!res.ok || !("ok" in json) || !json.ok) throw new Error((json as any)?.error || "Failed to create line");
        if (alive) setDbLineId(json.lineId);
      } catch (e) {
        if (alive) setFatal(formatErr(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [productId]);

  /* ---------------- Validation & dedupe ---------------- */
  function validateAndFilter(newFiles: File[], currentTotal: number): { valid: File[]; errors: string[] } {
    const errors: string[] = [];
    let list = newFiles;

    if (currentTotal + list.length > MAX_TOTAL_FILES) {
      errors.push(`Too many files. Up to ${MAX_TOTAL_FILES} total.`);
      list = list.slice(0, Math.max(0, MAX_TOTAL_FILES - currentTotal));
    }

    const valid: File[] = [];
    for (const f of list) {
      const ext = "." + (f.name.split(".").pop() || "").toLowerCase();
      if (!ACCEPT_EXT.includes(ext)) {
        errors.push(`Unsupported file: ${f.name}`);
        continue;
      }
      if (!withinLimit(f)) {
        errors.push(`File too large (>${MAX_FILE_MB}MB): ${f.name}`);
        continue;
      }
      valid.push(f);
    }
    return { valid, errors };
  }

  function isDuplicate(a: File, b: File) {
    return (
      a.name === b.name &&
      a.size === b.size &&
      a.type === b.type &&
      Math.abs((a as any).lastModified - (b as any).lastModified) < 1500
    );
  }

  /* ---------------- Add files to side ---------------- */
  const addFilesToSide = useCallback((sideIdx: number, input: FileList | File[]) => {
    const list = Array.from(input || []);
    if (list.length === 0) return;

    setSlots((prev) => {
      const next = prev.slice();
      const flatCount = prev.reduce((n, s) => n + s.items.length, 0);
      const { valid, errors } = validateAndFilter(list, flatCount);
      if (errors.length) {
        alert(errors[0]); // keep UX calm; show first error
      }
      if (valid.length === 0) return prev;

      // global dedupe across all sides
      const existing: File[] = [];
      prev.forEach((s) => s.items.forEach((it) => it.file && existing.push(it.file)));
      const filtered = valid.filter((nf) => !existing.some((ef) => isDuplicate(nf, ef)));

      const slot = { ...next[sideIdx] };
      const additions: FileItem[] = filtered.map((f) => ({
        id: uid(),
        file: f,
        name: safeName(f.name),
        type: f.type || "application/octet-stream",
        size: f.size || 0,
        previewUrl: isImage(f.type) ? URL.createObjectURL(f) : null,
        status: { kind: "idle" },
      }));
      slot.items = [...slot.items, ...additions];
      next[sideIdx] = slot;
      return next;
    });
  }, []);

  const onPick = useCallback(
    (sideIdx: number, list: FileList | null) => {
      if (!list) return;
      addFilesToSide(sideIdx, list);
    },
    [addFilesToSide],
  );

  /* ---------------- File drag/drop ---------------- */
  const onFileDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetSideIdx: number) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        addFilesToSide(targetSideIdx, e.dataTransfer.files);
        return;
      }
      if (fileDrag) {
        setSlots((prev) => {
          const next = prev.map((s) => ({ ...s, items: [...s.items] }));
          const from = next[fileDrag.fromSideIdx];
          const to = next[targetSideIdx];
          const idx = from.items.findIndex((it) => it.id === fileDrag.fileId);
          if (idx >= 0) {
            const [moved] = from.items.splice(idx, 1);
            to.items.push(moved);
          }
          return next;
        });
        setFileDrag(null);
      }
    },
    [addFilesToSide, fileDrag],
  );

  const onFileDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onFileDragStart = useCallback(
    (e: React.DragEvent<HTMLLIElement>, fromSideIdx: number, fileId: string) => {
      setFileDrag({ fromSideIdx, fileId });
      e.dataTransfer.effectAllowed = "move";
    },
    [],
  );

  /* ---------------- File reorder/move/remove ---------------- */
  const moveItemUp = (sideIdx: number, id: string) => {
    setSlots((prev) => {
      const next = prev.slice();
      const s = { ...next[sideIdx] };
      const i = s.items.findIndex((it) => it.id === id);
      if (i > 0) [s.items[i - 1], s.items[i]] = [s.items[i], s.items[i - 1]];
      next[sideIdx] = s;
      return next;
    });
  };
  const moveItemDown = (sideIdx: number, id: string) => {
    setSlots((prev) => {
      const next = prev.slice();
      const s = { ...next[sideIdx] };
      const i = s.items.findIndex((it) => it.id === id);
      if (i >= 0 && i < s.items.length - 1) [s.items[i + 1], s.items[i]] = [s.items[i], s.items[i + 1]];
      next[sideIdx] = s;
      return next;
    });
  };
  const removeItem = (sideIdx: number, id: string) => {
    setSlots((prev) => {
      const next = prev.slice();
      const s = { ...next[sideIdx] };
      const i = s.items.findIndex((it) => it.id === id);
      if (i >= 0) {
        const it = s.items[i];
        if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
        s.items.splice(i, 1);
      }
      next[sideIdx] = s;
      return next;
    });
  };

  /* ---------------- Side reorder ---------------- */
  const onSideDragStart = (idx: number) => () => {
    sideDragIdx.current = idx;
  };
  const onSideDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  const onSideDrop = (idx: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const from = sideDragIdx.current;
    sideDragIdx.current = null;
    if (from == null || from === idx) return;
    setSlots((prev) => {
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      return next.map((s, i) => ({ ...s, side: i + 1 }));
    });
  };
  const moveSideLeft = (idx: number) => {
    if (idx <= 0) return;
    setSlots((prev) => {
      const next = prev.slice();
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((s, i) => ({ ...s, side: i + 1 }));
    });
  };
  const moveSideRight = (idx: number) => {
    setSlots((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = prev.slice();
      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
      return next.map((s, i) => ({ ...s, side: i + 1 }));
    });
  };

  /* ---------------- Upload & attach pipeline ---------------- */
  async function presign(file: File): Promise<PresignResponse> {
  const contentType = ensureContentTypeFor(file);
  const filename = safeName(file.name);

  const body = {
    filename,                 // 👈 required by your route
    contentType,              // 👈 required by your route
    size: file.size,
    ext: extOf(filename),
    meta: { productId, lineId: dbLineId ?? initialLineId },
  };

  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });
  return (await res.json()) as PresignResponse;
}

async function presignThumb(name: string, contentType = "image/jpeg"): Promise<PresignResponse> {
  const filename = safeName(name);

  const body = {
    filename,                 // 👈 same shape
    contentType,
    size: undefined,
    ext: extOf(filename),
    meta: { productId, lineId: dbLineId ?? initialLineId, kind: "thumb" },
  };

  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });
  return (await res.json()) as PresignResponse;
}

  async function uploadToR2(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
  contentType?: string
) {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
      onProgress(pct);
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${xhr.status}`));
    };
    xhr.setRequestHeader("content-type", contentType || file.type || "application/octet-stream");
    xhr.send(file);
  });
}


  async function putBlob(url: string, blob: Blob, contentType = "image/jpeg") {
    const r = await fetch(url, {
      method: "PUT",
      headers: { "content-type": contentType },
      body: blob,
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`PUT failed: ${r.status}`);
  }

  async function attachAll(parts: PartToAttach[]) {
    const res = await fetch("/api/cart/attachments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        productId,
        cartLines: [{ lineId: dbLineId }],
        parts,
        qty: 1,
      }),
    });
    const j = await res.json();
    if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed to attach artwork");
  }

 // Upload a single fileItem (by indices in state) + generate & upload thumbnail
async function uploadOne(sideIdx: number, idx: number) {
  const it = slots[sideIdx]?.items[idx];
  if (!it || it.key || !it.file) return;

  // 1) presign original
  setSlots((prev) => {
    const next = prev.map((s) => ({ ...s, items: [...s.items] }));
    next[sideIdx].items[idx].status = { kind: "presigning" };
    return next;
  });
  const ps = await presign(it.file);
  if (!ps.ok || !ps.uploadUrl || !ps.key) throw new Error(ps.error || "Presign failed");

  // 👇 ensure the exact content-type we’ll PUT with (matches presign expectations)
  const ct = ensureContentTypeFor(it.file!);

  // 2) upload original with progress
  setSlots((prev) => {
    const next = prev.map((s) => ({ ...s, items: [...s.items] }));
    next[sideIdx].items[idx].status = { kind: "uploading", progress: 0 };
    return next;
  });
  await uploadToR2(ps.uploadUrl, it.file!, (pct) => {
    setSlots((prev) => {
      const next = prev.map((s) => ({ ...s, items: [...s.items] }));
      const cur = next[sideIdx].items[idx];
      if (cur?.status.kind === "uploading") cur.status = { kind: "uploading", progress: pct };
      return next;
    });
  }, ct); // 👈 pass contentType here

  // 3) mark done & store original key/url
  setSlots((prev) => {
    const next = prev.map((s) => ({ ...s, items: [...s.items] }));
    const cur = next[sideIdx].items[idx];
    if (cur) {
      cur.key = ps.key!;
      cur.url = ps.publicUrl || "";
      cur.status = { kind: "done" };
    }
    return next;
  });

  // 4) generate & upload thumbnail (non-fatal if it fails)
  try {
    const original = it.file!;
    let thumbBlob: Blob | null = null;
    if (/^application\/pdf$/i.test(original.type)) {
      thumbBlob = await renderPdfFirstPageToBlob(original);
    } else if (/^image\//i.test(original.type)) {
      thumbBlob = await downscaleImageToBlob(original, 1024);
    }

    if (thumbBlob) {
      const thumbName = original.name.replace(/\.[^.]+$/, "") + "_thumb.jpg";
      const pres = await presignThumb(thumbName, "image/jpeg");
      if (pres.ok && pres.uploadUrl && pres.key) {
        await putBlob(pres.uploadUrl, thumbBlob, "image/jpeg");
        // stash on item
        setSlots((prev) => {
          const next = prev.map((s) => ({ ...s, items: [...s.items] }));
          const cur = next[sideIdx].items[idx];
          if (cur) {
            cur._thumbKey = pres.key!;
            cur._thumbUrl = pres.publicUrl || "";
          }
          return next;
        });
      }
    }
  } catch {
    // ignore thumb errors
  }
}


  // Concurrency + retries
  async function runUploads() {
    const queue: Array<{ sideIdx: number; idx: number }> = [];
    slots.forEach((s, si) =>
      s.items.forEach((it, fi) => {
        if (!it.key && it.file) queue.push({ sideIdx: si, idx: fi });
      }),
    );
    if (queue.length === 0) throw new Error("No files selected.");

    let ptr = 0;
    const workers = Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, () => (async () => {
      while (ptr < queue.length) {
        const cur = queue[ptr++];
        let attempts = 0;
        let lastErr: any = null;
        while (attempts <= RETRIES) {
          try {
            await uploadOne(cur.sideIdx, cur.idx);
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
            attempts++;
            setSlots((prev) => {
              const next = prev.map((s) => ({ ...s, items: [...s.items] }));
              const it = next[cur.sideIdx].items[cur.idx];
              if (it) it.status = { kind: "error", message: formatErr(e) };
              return next;
            });
          }
        }
        if (lastErr) throw lastErr;
      }
    })());

    await Promise.all(workers);
  }

  async function onUploadAndContinue() {
    try {
      if (!dbLineId) {
        setFatal("Preparing your cart… one sec!");
        return;
      }
      const total = slots.reduce((n, s) => n + s.items.length, 0);
      if (total === 0) {
        setFatal("Please add at least one file.");
        return;
      }

      setBusy(true);
      setFatal(null);

      await runUploads();

      // Build parts payload (include thumbs if present)
      const parts: PartToAttach[] = [];
      slots.forEach((s) =>
        s.items.forEach((it) => {
          if (it.key) {
            const payload: PartToAttach = {
              key: it.key,
              url: it.url || "",
              fileName: it.name,
            };
            if (it._thumbKey) payload.thumbKey = it._thumbKey;
            if (it._thumbUrl) payload.thumbUrl = it._thumbUrl;
            parts.push(payload);
          }
        }),
      );
      if (parts.length === 0) throw new Error("No files were uploaded. Please try again.");

      await attachAll(parts);

      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {}
      router.push("/cart/review");
    } catch (e) {
      setFatal(formatErr(e));
      setBusy(false);
    }
  }

  /* ---------------- Derived ---------------- */
  const totalCount = useMemo(() => slots.reduce((n, s) => n + s.items.length, 0), [slots]);
  const uploadedCount = useMemo(
    () => slots.reduce((n, s) => n + s.items.filter((it) => it.status.kind === "done").length, 0),
    [slots],
  );
  const ready = Boolean(dbLineId);

  /* =========================================================
     Render
     ========================================================= */
  return (
    <section className="space-y-6" aria-label="Upload artwork">
      {!ready && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900" role="status">
          Setting up your cart…
        </div>
      )}
      {fatal && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700" role="alert">
          {fatal}
        </div>
      )}

      {/* Reorderable sides */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {slots.map((slot, sideIdx) => (
          <div
            key={slot.side}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            draggable
            onDragStart={onSideDragStart(sideIdx)}
            onDragOver={onSideDragOver}
            onDrop={onSideDrop(sideIdx)}
            aria-label={`Side ${slot.side}`}
          >
            {/* Side header */}
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="cursor-grab rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600" aria-hidden>
                  ⇅
                </span>
                <div className="text-sm font-semibold text-gray-800">Side {slot.side}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveSideLeft(sideIdx)}
                  className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50"
                  aria-label="Move side left"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => moveSideRight(sideIdx)}
                  className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50"
                  aria-label="Move side right"
                >
                  →
                </button>
                <div className="ml-2 text-xs text-gray-500">
                  {slot.items.length} file{slot.items.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDrop={(e) => onFileDrop(e, sideIdx)}
              onDragOver={onFileDragOver}
              className="relative mb-3 flex min-h-40 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50"
            >
              <div className="pointer-events-none p-6 text-center text-gray-500">
                <div className="text-xs">Drag files here or click to browse</div>
                <div className="mt-1 text-[11px] text-gray-400">
                  (PDF, AI, EPS, PSD, TIFF, JPG, PNG, SVG • up to {MAX_FILE_MB}MB each)
                </div>
              </div>
              <input
                ref={(el) => {
                fileInputs.current[sideIdx] = el;
                }}

                type="file"
                accept={ACCEPT}
                multiple
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => onPick(sideIdx, e.currentTarget.files)}
                aria-label={`Choose files for side ${slot.side}`}
              />
            </div>

            {/* File list */}
            {slot.items.length > 0 && (
              <ul className="space-y-2">
                {slot.items.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2"
                    draggable
                    onDragStart={(e) => onFileDragStart(e, sideIdx, it.id)}
                  >
                    {/* thumb */}
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-100" aria-hidden>
                      {it.previewUrl ? (
                        <img src={it.previewUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-500">
                          {it.type.split("/")[1]?.toUpperCase() || "FILE"}
                        </div>
                      )}
                    </div>

                    {/* info */}
                    <div className="min-w-0 grow">
                      <div className="truncate text-sm font-medium text-gray-800">{it.name}</div>
                      <div className="text-[11px] text-gray-500">{asMB(it.size).toFixed(2)} MB</div>

                      {/* progress/status */}
                      {it.status.kind === "uploading" && (
                        <div className="mt-1">
                          <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
                            <div
                              className="h-full w-0 bg-blue-600 transition-[width]"
                              style={{ width: `${it.status.progress}%` }}
                            />
                          </div>
                          <div className="mt-1 text-right text-[11px] text-gray-500">
                            {it.status.progress}%
                          </div>
                        </div>
                      )}
                      {it.status.kind === "error" && (
                        <div className="mt-1 rounded bg-red-50 px-2 py-1 text-[11px] text-red-700">
                          {it.status.message}
                        </div>
                      )}
                      {it.status.kind === "done" && (
                        <div className="mt-1 rounded bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">
                          Uploaded
                        </div>
                      )}
                    </div>

                    {/* actions */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveItemUp(sideIdx, it.id)}
                          className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50"
                          aria-label="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItemDown(sideIdx, it.id)}
                          className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50"
                          aria-label="Move down"
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(sideIdx, it.id)}
                        className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50"
                        aria-label="Remove file"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Side footer */}
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-gray-500">Tip: drag a file to another side panel to reassign.</div>
              <button
                type="button"
                onClick={() => fileInputs.current[sideIdx]?.click()}
                className="inline-flex h-9 items-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-800 hover:bg-gray-50"
              >
                Add more
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          Selected: <span className="font-semibold">{totalCount}</span> • Uploaded:{" "}
          <span className="font-semibold">{uploadedCount}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!ready || busy}
            onClick={() => fileInputs.current.find(Boolean)?.click()}
            className="inline-flex h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add files
          </button>
          <button
            type="button"
            disabled={!ready || busy || totalCount === 0}
            onClick={onUploadAndContinue}
            className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Upload & Continue"}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Files are uploaded to secure storage and delivered fast via our Cloudflare CDN. Pricing & shipping flow stays aligned
        with the SinaLite API documentation (US storeCode=9 / CA=6). 🙌
      </p>
    </section>
  );
}
