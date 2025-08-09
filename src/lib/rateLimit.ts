// src/lib/rateLimit.ts
import { Redis } from "@upstash/redis";
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! });

export default async function rateLimit({ key, limit, window }: { key: string; limit: number; window: number }) {
  const curr = await redis.incr(key);
  if (curr === 1) {
    await redis.expire(key, window);
  }
  return curr <= limit;
}
