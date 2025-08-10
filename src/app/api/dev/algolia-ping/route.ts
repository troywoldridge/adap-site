// src/app/api/dev/algolia-ping/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID?.trim() || "";
  const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY?.trim() || "";
  const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME?.trim() || "";

  if (!appId || !apiKey || !indexName) {
    return NextResponse.json(
      { ok: false, error: "Missing envs", appId: !!appId, apiKey: !!apiKey, indexName: !!indexName },
      { status: 400 }
    );
  }

  // Search call that works with the Search-Only key
  const url = `https://${appId}-dsn.algolia.net/1/indexes/${encodeURIComponent(indexName)}/query`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Algolia-Application-Id": appId,
        "X-Algolia-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "", hitsPerPage: 1 }),
      cache: "no-store",
    });

    const text = await res.text();
    let body: any = text;
    try { body = JSON.parse(text); } catch {}

    return NextResponse.json(
      { ok: res.ok, status: res.status, statusText: res.statusText, body },
      { status: res.ok ? 200 : 500 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
