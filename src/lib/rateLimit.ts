// src/lib/rateLimit.ts
import { NextResponse } from "next/server";

/**
 * Simple in-memory IP-based token bucket.
 * - Suitable for single-instance or dev use.
 * - For distributed deployments, replace with Redis or an edge KV.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function ipFrom(req: Request): string {
  const xff = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  return xff || "local";
}

function keyFor(req: Request, scope: string) {
  return `${scope}:${ipFrom(req)}`;
}

/**
 * Low-level limiter.
 * Throws an Error with status/headers when the limit is exceeded.
 * Returns rate headers on success (so you can forward them if you want).
 */
export async function rateLimit(
  req: Request,
  scope = "api",
  limit = 60,
  windowMs = 60_000,
): Promise<{ headers: Record<string, string> }> {
  const now = Date.now();
  const key = keyFor(req, scope);

  const bucket = buckets.get(key) ?? { count: 0, resetAt: now + windowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  const remaining = Math.max(0, limit - bucket.count);
  const resetSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(resetSec),
  };

  if (bucket.count > limit) {
    const err = new Error(`Rate limit exceeded. Try again in ${resetSec}s.`);
    (err as any).status = 429;
    (err as any).headers = {
      ...headers,
      "Retry-After": String(resetSec),
    };
    throw err;
  }

  return { headers };
}

/**
 * High-level adapter for API routes.
 * - Returns a NextResponse(429) when limited, otherwise `null`.
 * - Keeps your route code clean:
 *
 *   const limited = await enforceRateLimit(req, "orders:show", 40, 60_000);
 *   if (limited) return limited;
 */
export async function enforceRateLimit(
  req: Request,
  scope = "api",
  limit = 60,
  windowMs = 60_000,
): Promise<NextResponse | null> {
  try {
    await rateLimit(req, scope, limit, windowMs);
    return null;
  } catch (err: any) {
    const status = Number(err?.status) || 429;
    const message = (err?.message as string) || "Too many requests";
    const hdrs = new Headers();
    const h = err?.headers as Record<string, string> | undefined;
    if (h) for (const [k, v] of Object.entries(h)) hdrs.set(k, String(v));
    hdrs.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

    return NextResponse.json({ error: message }, { status, headers: hdrs });
  }
}
