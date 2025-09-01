// src/app/guides/page.tsx
import type { Metadata } from "next";
import path from "node:path";
import { promises as fsp } from "node:fs";
import GuidesClient from "@/components/guides/GuidesClient";

export const runtime = "nodejs";        // we use fs
export const dynamic = "force-dynamic"; // read disk in dev

export const metadata: Metadata = {
  title: "Artwork Setup Guides",
  description: "Download print-ready PDF templates and file setup guides for every product.",
};

export type FileNode = {
  label: string;
  href: string;       // /guides/…
  sizeBytes: number;  // for display
  mtimeMs: number;    // for sitemap & sort
};

export type DirNode = {
  title: string;
  children: DirNode[];
  files: FileNode[];
};

const GUIDES_ROOT = path.join(process.cwd(), "public", "guides");

function humanizeFolder(name: string) {
  return name.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function humanizeFile(base: string) {
  let s = base.replace(/\.[^.]+$/, "");
  s = s.replace(/\s*\(\d+\)\s*$/, "");         // drop “(1)”
  s = s.replace(/[_-]+/g, " ");
  s = s.replace(/\s*x\s*/gi, " × ");           // 12 × 24
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
  return s;
}

async function readDirTree(dirAbs: string, rel = ""): Promise<DirNode> {
  const entries = await fsp.readdir(dirAbs, { withFileTypes: true });

  const children: DirNode[] = [];
  const files: FileNode[] = [];

  for (const e of entries) {
    if (e.name.startsWith(".")) continue; // hide .DS_Store, etc.
    const abs = path.join(dirAbs, e.name);
    const relPath = path.posix.join(rel, e.name.replaceAll("\\", "/"));

    if (e.isDirectory()) {
      children.push(await readDirTree(abs, relPath));
    } else if (e.isFile() && /\.pdf$/i.test(e.name)) {
      const stat = await fsp.stat(abs);
      files.push({
        label: humanizeFile(e.name),
        href: "/guides/" + relPath,
        sizeBytes: stat.size,
        mtimeMs: stat.mtimeMs,
      });
    }
  }

  children.sort((a, b) => a.title.localeCompare(b.title));
  files.sort((a, b) => a.label.localeCompare(b.label));

  return {
    title: humanizeFolder(path.basename(dirAbs)),
    children,
    files,
  };
}

async function loadGuides(): Promise<DirNode[]> {
  const top = await fsp.readdir(GUIDES_ROOT, { withFileTypes: true });
  const out: DirNode[] = [];
  for (const dir of top) {
    if (!dir.isDirectory()) continue;
    out.push(await readDirTree(path.join(GUIDES_ROOT, dir.name), dir.name));
  }
  out.sort((a, b) => a.title.localeCompare(b.title));
  return out;
}

export default async function GuidesPage() {
  const data = await loadGuides();
  return <GuidesClient data={data} />;
}
