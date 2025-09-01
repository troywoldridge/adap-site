// src/components/guides/GuidesClient.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DirNode, FileNode } from "@/app/guides/page";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function TrackedPdfLink({ file, categoryPath }: { file: FileNode; categoryPath: string }) {
  const onClick = () => {
    const payload = {
      href: file.href,
      label: file.label,
      sizeBytes: file.sizeBytes,
      categoryPath,
      ts: Date.now(),
    };
    try {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      if (!navigator.sendBeacon || !navigator.sendBeacon("/api/analytics/guide-download", blob)) {
        fetch("/api/analytics/guide-download", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // ignore analytics errors
    }
  };

  return (
    <a
      href={file.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="text-blue-700 underline-offset-2 hover:underline"
    >
      {file.label}
    </a>
  );
}

function Section({ node, path }: { node: DirNode; path: string }) {
  const nextPath = path ? `${path} / ${node.title}` : node.title;

  return (
    <details className="group rounded-lg border border-slate-300 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 hover:bg-slate-50">
        <span className="font-semibold text-slate-900">{node.title}</span>
        <svg
          className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </summary>

      <div className="border-t border-slate-200 px-4 py-3">
        {node.files.length > 0 && (
          <ul className="ml-5 list-disc space-y-1">
            {node.files.map((f) => (
              <li key={f.href} className="text-slate-700">
                <TrackedPdfLink file={f} categoryPath={nextPath} />
                <span className="ml-2 inline-flex items-center rounded-md border border-slate-300 px-1.5 py-0.5 text-xs text-slate-700">
                  PDF • {formatBytes(f.sizeBytes)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {node.children.length > 0 && (
          <div className="mt-3 space-y-2">
            {node.children.map((child) => (
              <Section key={`${nextPath}/${child.title}`} node={child} path={nextPath} />
            ))}
          </div>
        )}

        {node.files.length === 0 && node.children.length === 0 && (
          <p className="text-sm text-slate-600">No guides in this section yet.</p>
        )}
      </div>
    </details>
  );
}

export default function GuidesClient({ data }: { data: DirNode[] }) {
  const [q, setQ] = useState("");

  // Flatten for quick global search
  const flat = useMemo(() => {
    const rows: { file: FileNode; categoryPath: string }[] = [];
    const walk = (node: DirNode, path: string) => {
      const nextPath = path ? `${path} / ${node.title}` : node.title;
      node.files.forEach((f) => rows.push({ file: f, categoryPath: nextPath }));
      node.children.forEach((c) => walk(c, nextPath));
    };
    data.forEach((d) => walk(d, ""));
    return rows;
  }, [data]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return flat;
    return flat.filter(
      (r) =>
        r.file.label.toLowerCase().includes(s) ||
        r.categoryPath.toLowerCase().includes(s) ||
        r.file.href.toLowerCase().includes(s)
    );
  }, [flat, q]);

  return (
    <main className="px-4 py-6">
      <div className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <header className="mb-4">
          <h1 className="text-xl font-bold text-slate-900">Artwork Setup Guides</h1>
          <p className="mt-1 text-sm text-slate-600">
            Download PDF templates and follow the prep tips so your designs print perfectly.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search guides… (e.g. Vinyl, 24 × 36, A-Frame)"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-200 focus:ring"
            />
            {q && (
              <span className="whitespace-nowrap text-xs text-slate-500">
                {results.length} match{results.length === 1 ? "" : "es"}
              </span>
            )}
          </div>
        </header>

        {/* If searching, show a flat results list; else show accordions */}
        {q ? (
          <div className="rounded-lg border border-slate-200">
            {results.length === 0 ? (
              <p className="p-4 text-sm text-slate-600">No results.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {results.map(({ file, categoryPath }) => (
                  <li key={file.href} className="flex items-center justify-between gap-3 px-4 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        <TrackedPdfLink file={file} categoryPath={categoryPath} />
                      </div>
                      <div className="truncate text-xs text-slate-500">{categoryPath}</div>
                    </div>
                    <span className="shrink-0 rounded-md border border-slate-300 px-1.5 py-0.5 text-xs text-slate-700">
                      PDF • {formatBytes(file.sizeBytes)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((node) => (
              <Section key={node.title} node={node} path="" />
            ))}
          </div>
        )}

        <footer className="mt-6 border-t border-slate-200 pt-3 text-xs text-slate-500">
          Served via Cloudflare CDN. Guide structure mirrors product categories per the Sinalite API documentation.
        </footer>
      </div>
    </main>
  );
}
