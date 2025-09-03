// src/app/sitemap-jobs.xml/route.ts
import { NextResponse } from "next/server";
import { JOBS, siteUrl } from "@/data/jobs";

// Custom XML route for /sitemap-jobs.xml
// Great for surfacing per-job URLs to crawlers, alongside your main /sitemap.xml

function escapeXml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const base = siteUrl();
  const now = new Date().toISOString();

  const urls = JOBS.map((job) => {
    const loc = `${base}/careers/${job.slug}`;
    return `
  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
  ${urls}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
  });
}
