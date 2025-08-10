// lib/rateLimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const redis = Redis.fromEnv();

export const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(60, "1 m"), // 60 requests per minute per IP
  analytics: true,
});

export async function enforceRateLimit(req: NextRequest) {
  const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? "unknown";
  const { success, remaining, reset } = await rateLimiter.limit(String(ip));

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": Math.max(1, Math.ceil((reset - Date.now()) / 1000)).toString() },
      }
    );
  }
  return null;
}
