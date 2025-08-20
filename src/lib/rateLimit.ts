// src/lib/basicRateLimit.ts
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function keyFor(req: Request, scope: string) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  return `${scope}:${ip}`;
}

/** Allow `limit` requests per `windowMs` per IP+scope */
export async function rateLimit(req: Request, scope: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const key = keyFor(req, scope);
  const b = buckets.get(key) ?? { count: 0, resetAt: now + windowMs };
  if (now > b.resetAt) {
    b.count = 0;
    b.resetAt = now + windowMs;
  }
  b.count++;
  buckets.set(key, b);
  const remaining = Math.max(0, limit - b.count);
  const resetSec = Math.ceil((b.resetAt - now) / 1000);

  if (b.count > limit) {
    const err = new Error(`Rate limit exceeded. Try again in ${resetSec}s.`);
    (err as any).status = 429;
    (err as any).headers = {
      "Retry-After": String(resetSec),
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(resetSec),
    };
    throw err;
  }
  return {
    headers: {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(resetSec),
    },
  };
}
