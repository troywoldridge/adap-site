// src/lib/guides-sitemap.ts
import type { MetadataRoute } from "next";
import path from "node:path";
import { promises as fsp } from "node:fs";

const GUIDES_ROOT = path.join(process.cwd(), "public", "guides");

async function walk(dirAbs: string, rel = ""): Promise<{ href: string; lastMod: Date }[]> {
  const out: { href: string; lastMod: Date }[] = [];
  const entries = await fsp.readdir(dirAbs, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const abs = path.join(dirAbs, e.name);
    const relPath = path.posix.join(rel, e.name.replaceAll("\\", "/"));
    if (e.isDirectory()) {
      out.push(...(await walk(abs, relPath)));
    } else if (e.isFile() && /\.pdf$/i.test(e.name)) {
      const stat = await fsp.stat(abs);
      out.push({ href: `/guides/${relPath}`, lastMod: stat.mtime });
    }
  }
  return out;
}

export async function guidesSitemapEntries(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/guides`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  const files = await walk(GUIDES_ROOT);
  files.sort((a, b) => a.href.localeCompare(b.href));
  for (const f of files) {
    entries.push({
      url: `${baseUrl}${f.href}`,
      lastModified: f.lastMod,
      changeFrequency: "yearly",
      priority: 0.3,
    });
  }

  return entries;
}
